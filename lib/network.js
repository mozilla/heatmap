"use strict";
/* globals Services, NetUtil */
/*
This module exports a thing that will upload files ot the server.
We should consolidate this with the checkpoint code.

*/
var {Cc, Ci, Cu} = require('chrome');

var ROOT_URL = require("./heatmap_consts").ROOT_URL;

var UPLOAD_URL = ROOT_URL + "/upload";
var DELETE_URL = ROOT_URL + "/delete";

var simple_prefs = require("sdk/simple-prefs");

var Jose = require("./jose").Jose;
var JoseJWE = require("./jose").JoseJWE;

const CRYPTO_KEYS = require("./heatmap_consts").CRYPTO_KEYS;


// Blargh. We need NetUtil.jsm to read inputstreams into strings.
// Not actually networking. at all.
Cu.import("resource://gre/modules/NetUtil.jsm");
Cu.import("resource://gre/modules/Services.jsm");

// TODO: use a library import thing
const FS_CONST = require("./heatmap_consts").FS_CONST;


function readStringFromFile(short_filename) {
    var file = Cc["@mozilla.org/file/directory_service;1"].getService(Ci.nsIProperties).get("ProfD", Ci.nsIFile);

    file.append(short_filename);

    if (!file.exists()) {
        return null;
    }
    var stream = Cc["@mozilla.org/network/file-input-stream;1"].createInstance(Ci.nsIFileInputStream);
    stream.init(file, FS_CONST.PR_RDONLY, 1092, 0);

    var value = NetUtil.readInputStreamToString(stream, 
                                                stream.available());
                                                stream.close();
                                                return value;
}

function getUUID() {
    /*
     * We use our own custom GUID for the user.  It's unrelated to
     * anything other than the specific browser that this addon is
     * installed into.
     */
    var uuid = simple_prefs.prefs.heatmap_uuid;
    if (uuid === undefined) {
        // Generate a UUID if we don't have a user ID yet and
        // stuff it into prefs
        uuid = makeGUID();
        simple_prefs.prefs.heatmap_uuid = uuid;
    }
    return uuid;
}


function deleteServerData() {
    var headers = {'X-User': getUUID()};
    var data = '';
    var Request = require("sdk/request").Request;
    var deleteRequest = Request({
      url: DELETE_URL,
      headers: headers,
      content: data,
      overrideMimeType: 'application/json',
      onComplete: function (response) {
          // TODO: we should send a notification that the chrome
          // process can handle
      }
    });

    // Be a good consumer and check for rate limiting before doing more.
    deleteRequest.post();
}

function makeGUID() {
    /* 
     * Generate a URL friendly 10 character UUID.
     * This code is lifted out of the sync client code in Firefox.
     */
    // 70 characters that are not-escaped URL-friendly
    const code =
        "!()*-.0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz~";

    let guid = "";
    let num = 0;
    let val;

    // Generate ten 70-value characters for a 70^10 (~61.29-bit) GUID
    for (let i = 0; i < 10; i++) {
        // Refresh the number source after using it a few times
        if (i === 0 || i === 5)
            num = Math.random();

        // Figure out which code to use for the next GUID character
        num *= 70;
        val = Math.floor(num);
        guid += code[val];
        num -= val;
    }

    return guid;
}

function uploadFile(short_filename) {
    /*
     * Uploads file to the context graph ingestion server
     */

    var data = readStringFromFile(short_filename);
    var headers = {'X-User': getUUID()};
    var Request = require("sdk/request").Request;
    //console.log("Posting with data : " + data);

    var rsa_key = Jose.Utils.importRsaPublicKey(CRYPTO_KEYS, 'RSA-OAEP');
    var cryptographer = new Jose.WebCryptographer();
    var encrypter = new JoseJWE.Encrypter(cryptographer, rsa_key);
    var cipher_text_promise = encrypter.encrypt(data);
    //console.log("data is encrypted");

    cipher_text_promise.then(function(crypto_data) {
        //console.log("Using encrypted blob: " + crypto_data);
        var heatmapRequest = Request({
            url: UPLOAD_URL,
            headers: headers,
            content: crypto_data,
            overrideMimeType: 'application/json',
            onComplete: function (response) {
                //console.log("UPLOAD Got response status: ["+response.status+"]");
                //console.log("UPLOAD Got response text : ["+response.statusText+"]");
                //for (var headerName in response.headers) {
                    //console.log(headerName + ":" + response.headers[headerName]);
                //}
                //console.log("UPLOAD Got response text: ["+response.text+"]");

                // Always try to delete the data if the server
                // responded.  We only keep the file in the event of
                // network failure, or apparent network failure if the
                // server never comes back.
                deleteFile(short_filename);
            }
        });

        heatmapRequest.post();
        //console.log("upload is done!");
    });

}

function uploadAllFiles() {
    var file = Services.dirsvc.get("ProfD", Ci.nsIFile);
    var entryEnum = file.directoryEntries;
    while (entryEnum.hasMoreElements()) {
        var tmpFile = entryEnum.getNext().QueryInterface(Ci.nsILocalFile);
        if (tmpFile.leafName.indexOf("heatmap.history_") > -1) {
            uploadFile(tmpFile.leafName);
        }
    }
}

/*  No idea why this won't work when i put the deleteFile function in
 *  lib/fs.js and add the proper exports declartion.  *shrug*.
 *  Javascript.
 */
function deleteFile(short_filename) {
    var file = Cc["@mozilla.org/file/directory_service;1"].getService(Ci.nsIProperties).get("ProfD", Ci.nsIFile);
    file.append(short_filename);

    //console.log("File pre delete exists: " + file.exists());
    file.remove(false);
    //console.log("File post delete ["+file.path+"] exists: " + file.exists());
}


exports.uploadFile = uploadFile;
exports.uploadAllFiles = uploadAllFiles;
exports.deleteServerData = deleteServerData;
