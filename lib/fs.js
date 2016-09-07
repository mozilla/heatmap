"use strict";

/* globals Services */

/*eslint no-unused-vars: 1*/

/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/*
 * fs.js
 *
 * This javascript module provides two classes:
 *  - `Serializer` to write JSON data and read JSON data from a file.
 *
 */

var libnetwork = require("./network");
var {Ci, Cu, Cc} = require("chrome");

const FS_CONST = require("./heatmap_consts").FS_CONST;

Cu.import("resource://gre/modules/Services.jsm");

function Serializer(blob_list) {
    this.blob_list = blob_list;
    this.blob_list.sort(function(a, b) {
        return a.lastAccessTime - b.lastAccessTime;
    });

    this.latest_item = this.blob_list[this.blob_list.length-1];
    let tmpDate = new Date(this.latest_item.start_time);
    this.short_filename = "heatmap.history_" + this.dateStamp(tmpDate) + ".json";

}

Serializer.prototype = {
    dateStamp: function(d) {
        function pad(n) {
            return n<10 ? '0'+n : n;
        }

        return d.getUTCFullYear()+
             pad(d.getUTCMonth()+1)+
             pad(d.getUTCDate())+'T'+
             pad(d.getUTCHours())+
             pad(d.getUTCMinutes())+
             pad(d.getUTCSeconds())+'Z';
    },

    save: function() {
        var jsonString = JSON.stringify({'sessions': this.blob_list});
        this.writeStringToFile(jsonString);
    },

    writeStringToFile: function(data) {
        var file = Cc["@mozilla.org/file/directory_service;1"].getService(Ci.nsIProperties).get("ProfD", Ci.nsIFile);
        file.append(this.short_filename);
        var fs = Cc["@mozilla.org/network/file-output-stream;1"].createInstance(Ci.nsIFileOutputStream);
        fs.init(file, FS_CONST.PR_WRONLY | FS_CONST.PR_CREATE_FILE | FS_CONST.PR_TRUNCATE, -1, 0); // write only, create, truncate
        fs.write(data, data.length);
        fs.close();

        // Spin up an async task to upload this file.
        libnetwork.uploadFile(this.short_filename, 0);
    }

};

function deleteFile(short_filename) {
    var file = Cc["@mozilla.org/file/directory_service;1"].getService(Ci.nsIProperties).get("ProfD", Ci.nsIFile);
    file.append(short_filename);

    //console.log("File pre delete exists: " + file.exists());
    file.remove(false);
    //console.log("File post delete ["+file.path+"] exists: " + file.exists());
}

function deleteAllJSONHistory() {
    //console.log("Start JSON cleanup");
    var file = Services.dirsvc.get("ProfD", Ci.nsIFile);
    var entryEnum = file.directoryEntries;
    while (entryEnum.hasMoreElements()) {
        var tmpFile = entryEnum.getNext().QueryInterface(Ci.nsILocalFile);
        //var thisPath = tmpFile.path;
        if (tmpFile.leafName.indexOf("heatmap.history_") > -1) {
            tmpFile.remove(false);
        }
    }
    //console.log("End JSON cleanup");
}

exports.Serializer = Serializer;
exports.deleteFile = deleteFile;
exports.deleteAllJSONHistory = deleteAllJSONHistory;
