"use strict";

/* globals Services, NetUtil */
/*eslint no-unused-vars: 1*/


/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/*
 * heatmap.js
 *
 * This javascript module acts as a facade for a DOM event listener
 * and a browser chrome event listener.
 *
 * The intent of this module is to be able to capture any and all user
 * driven events on the browser.
 *
 * Subscribers can register with the system to receive notifications
 * of new events.  Data serialization is outside the scope of this
 * module.
 */

var {Cc, Ci, Cu} = require("chrome");
var { setTimeout } = require("sdk/timers");

var libnetwork = require("./network");
var libtabtracker = require("./TabTracker");
var libfs = require("./fs");
var porn_js = require("./pornbf");
const FS_CONST = require("./heatmap_consts").FS_CONST;

var bf = require("./bloomfilter.js"),
    BloomFilter = bf.BloomFilter;

// Clobber the string prototype so we can use replaceAll
String.prototype.replaceAll = function(search, replacement) {
    var target = this;
    return target.replace(new RegExp(search, 'g'), replacement);
};

const TAB_SESSION_COMPLETE = require("./heatmap_consts").TAB_SESSION_COMPLETE;
const DELETE_SERVER_DATA = require("./heatmap_consts").DELETE_SERVER_DATA;

// Blargh. We need NetUtil.jsm to read inputstreams into strings.
// Not actually networking. at all.
Cu.import("resource://gre/modules/NetUtil.jsm");
Cu.import("resource://gre/modules/Services.jsm");

// FileUtils makes dealing with the profile directory easier
Cu.import("resource://gre/modules/FileUtils.jsm");

// Set the delay to update the logs
var REPEAT_SECONDS = 1;
var REPEAT_DELAY = REPEAT_SECONDS * 1000;

// Globals to keep track of the history
var HISTORY_RECORDS = {};

var FLUSH_SIZE = require("./heatmap_consts").FLUSH_SIZE;

var Heatmap = function() {
    this.black_list = {};

    try {
        //console.log("Loading bloom filter.");
        let array = JSON.parse(porn_js.porn_js);
        this.porn_filter = new BloomFilter(array, 3);
        //console.log("Bloom filter loaded.");
    } catch (err) {
        //console.log(err);
    }
};

Heatmap.prototype = {
    usec_to_ms: function(tstamp) {
        /*
         * Converts PlacesDB start_time timestamps from microseconds
         * to milliseconds.
         */
        return tstamp / 1000;
    },
    ms_to_usec: function(tstamp) {
        return tstamp * 1000;
    },

    // Clean up the URL from a number of
    // privacy revealing problems.
    clean_url: function(urlstring) {
        // Drop anything that isn't http or https
        if (!urlstring.startsWith('http')) {
            //console.log("Ignoring URL: ["+urlstring+"]");
            return "";
        }


        // Remove any basic auth URLs
        let basic_auth = new RegExp("http.?:\/\/.*:.*@.*");
        if (basic_auth.test(urlstring)) {
            return "";
        }

        //  Porn filtering
        var url = require("sdk/url").URL(urlstring);
        if (url.hostname) {
            var host_parts = url.hostname.split(".").reverse();
            var short_host = host_parts[1] + '.' + host_parts[0];
            if (this.porn_filter.test(short_host)) {
                return "";
            }
        }

        // Filter out tokens
        for (var prop in this.black_list) {
            let termRE = new RegExp("http.*"+prop);
            if (termRE.test(urlstring)) {
                urlstring = urlstring.replaceAll(prop, '[USERNAME]');
            }
        }
        return urlstring;
    },

    observe: function(subject, topic, data) {
        switch (topic) {
            case TAB_SESSION_COMPLETE:
                var jsondata = JSON.parse(data);
                var url = jsondata.url;
                HISTORY_RECORDS[url] = data;
                break;
            case DELETE_SERVER_DATA:
                libnetwork.deleteServerData();
                libfs.deleteAllJSONHistory();
                break;
        }
    },

    updatePrefs: function(new_bl) {
        let partsOfStr = new_bl.split(',');

        // Reset the black_list
        this.black_list = {};
        for (var prop in this.black_list) {
            if (this.black_list.hasOwnProperty(prop)) {
                delete this.black_list[prop];
            }
        }
        //console.log("Cleared blacklist");
        for (var item in partsOfStr) {
            this.black_list[item] = 1;
        }
    },

    main_loop: function() {
        if (Object.keys(HISTORY_RECORDS).length > FLUSH_SIZE) {
            this.flushData();
        }
        setTimeout(() => {
            this.main_loop();
        }, REPEAT_DELAY);
    },

    writeCheckPoint: function() {
        /*
         * Given a Javascript array of JSON objects, iterate
         * over all objects and find the greatest start_time.
         * Write out the start_time in milliseconds since epoch
         * to the heatmap.checkpoint file.
         */
        // TODO: rewrite this to use FileUtils instead of the
        // XPCOM components for file i/o
        let newCheckPoint = 0;
        for (var item in HISTORY_RECORDS) {
            let normItemTS = item.start_time;
            if (newCheckPoint < normItemTS) {
                newCheckPoint = normItemTS;
            }
        }

        let oldCheckPoint = this.loadCheckPoint();
        if (oldCheckPoint < newCheckPoint) {
            // TODO: refacor this function block into a nice tidy
            // object
            var checkPoint = {};
            checkPoint.checkPoint = newCheckPoint;
            var checkPointJSON = JSON.stringify(checkPoint);

            var short_filename = "heatmap.checkpoint";
            this.writeStringToFile(short_filename, checkPointJSON);
        }
    },

    writeStringToFile: function (short_filename, data) {
        var file = Cc["@mozilla.org/file/directory_service;1"].getService(Ci.nsIProperties).get("ProfD", Ci.nsIFile);
        file.append(short_filename);
        var fs = Cc["@mozilla.org/network/file-output-stream;1"].createInstance(Ci.nsIFileOutputStream);
        fs.init(file, FS_CONST.PR_WRONLY | FS_CONST.PR_CREATE_FILE | FS_CONST.PR_TRUNCATE, -1, 0); // write only, create, truncate
        fs.write(data, data.length);
        fs.close();
    },

    loadCheckPoint: function() {
        /*
         * Return the checkpoint in milliseconds since epoch.
         * If no checkpoint exists, return 0.
         */
        var filename = "heatmap.checkpoint";
        var file = Cc["@mozilla.org/file/directory_service;1"].getService(Ci.nsIProperties).get("ProfD", Ci.nsIFile);

        file.append(filename);
        if (!file.exists()) {
            return 0;
        }
        var istream = Cc["@mozilla.org/network/file-input-stream;1"].createInstance(Ci.nsIFileInputStream);
        istream.init(file, FS_CONST.PR_RDONLY, 1092, 0);

        var value = NetUtil.readInputStreamToString(istream,
                                                    istream.available());

        let parsedValue = JSON.parse(value);
        istream.close();
        return parsedValue.checkPoint;
    },


    flushData: function() {

        // Make a copy of the records
        var tmpRECORDS = HISTORY_RECORDS;

        for (var url in HISTORY_RECORDS) {
            let jsondata = JSON.parse(HISTORY_RECORDS[url]);
            var origURL = url;

            url = this.clean_url(url);
            if (url.length == 0){
                // This URL was cleaned up and discarded entirely
                delete tmpRECORDS[origURL];
            } else {
                // Clobber the URL in the payload
                jsondata.url = url;
                tmpRECORDS[origURL] = jsondata;
            }
        }

        var blob_list = Object.values(tmpRECORDS);
        if (blob_list.length > 0) {
            var serializer = new libfs.Serializer(blob_list);
            serializer.save();
            this.writeCheckPoint();
        }

        HISTORY_RECORDS = {};
    }
};

try {
    libnetwork.uploadAllFiles();

    var hMap = new Heatmap();
    //console.log("done Creating new Heatmap");

    // Ignore eslint - we need to keep this around
    // to emit messages to the heatmap when a tab event occurs
    var tracker = new libtabtracker.TabTracker();  // eslint-disable-line

    //console.log("done Creating tab tracker");
} catch (err) {
    console.log(err);
}

function main() {
    Services.obs.addObserver(hMap.observe, TAB_SESSION_COMPLETE);
    Services.obs.addObserver(hMap.observe, DELETE_SERVER_DATA);
    hMap.main_loop();
}

exports.main = main;
exports.updatePrefs = hMap.updatePrefs.bind(hMap);
