/*
 * Various constants used within heatmap
 */

// These constants are required to handle file streams, but aren't
// available through the addons SDK
// Note that these have been converted from octal to base10 because
// JS is terrible.
const FS_CONST = {
    PR_RDONLY: 1,
    PR_WRONLY: 2,
    PR_RDWR: 4,
    PR_CREATE_FILE: 8,
    PR_APPEND: 16,
    PR_TRUNCATE: 32,
    PR_SYNC: 64,
    PR_EXCL: 128
};

const TAB_SESSION_COMPLETE = "tab-session-complete";
const DELETE_SERVER_DATA = "delete-server-data";
const DELETE_COMPLETED = "delete-server-data-completed";
const DELETE_FAILED = "delete-server-data-failed";
const UNINSTALL_ADDON = "uninstall-addon";

const STUDY_END_DATE = new Date(2016, 10, 15);

// Maximum number of records before we flush to disk
// Set this to 1 to flush all the time while debugging.
const FLUSH_SIZE = 10;

const BLOCKED_TLDS = ['adult', 'porn', 'sex', 'sexy', 'xxx'];

var PROD_CRYPTO_KEYS = {"e": "AQAB",
                     "n": "pu2VKNcaf34gbvrXn-wpC23-gJ3Ga6brxXIB8usHG35JqSSg51H9k5CQyLkpX6SVUnEcMUluOUfqpYgOUDYY4o1fKuL4q6J-d47FUo3okK2PKj5UE6g_-w90neZQ4-HHKQCyWAF4Bvh-_6j-cQV_ubDbNVLGN5s7w0r2I50bcUoR4lkB5mUoESCnRgcbSl5Q5-PRQXtkW_-UrHXK_wdBFsMVmz9Js6GLoKXBwV9X3qV8_upQpghbofUiNhiANgHyGamFcDEC04alqftrjsjm37k6An_ADCkbuRD3q1jONA15ENz3xgeg1o8XUWgs0EaW3YJMRyQM-JjIuG6KnBCdVw",
                     "kty": "RSA"};


var STAGE_CRYPTO_KEYS = {"e": "AQAB", 
                    "n": "l9bFKmAYuy4iNhqqs1PdrlZJ_t4oVssfoVz7RgHd-qN9iq_MiT1etGidOLih6jL27Jar9u2_qtijFSbliz4KB70Eq6GC0VADuMTfHB8rj5_Zaa5I1RQTPN5FwgkcDgxk4nj6p8ToghnDUzBJjg8w9QOiwt1dJG13V4IbfC0xok3QUGFAY1Uaggk1lmqyugB9RCW027f_6OZzOXeDimNcdE0IEiAggsoX_24jMWTb3bgbk6yYTZjXhrOr7qGAivgMD4RjoBd2mH5BzdHEMNdfvcHYkMG8ODTedVSvZHf4e8QRavMFBHMuf89wE_iy_IQmtmjherNb7Guns4ZrTf1O5w",
                    "kty": "RSA"};

var PROD_URL = "https://miracle.services.mozilla.com/v1";
var STAGE_URL = "https://miracle.stage.mozaws.net/v1";

var ROOT_URL = "";
var CRYPTO_KEYS = {};

function underTest() {
    var system = require("sdk/system");
    if ("HEATMAP_TEST" in system.env) {
        return true;
    }
    return false;
}

if (underTest()) {
    ROOT_URL = STAGE_URL;
    CRYPTO_KEYS = STAGE_CRYPTO_KEYS;
} else {
    ROOT_URL = PROD_URL;
    CRYPTO_KEYS = PROD_CRYPTO_KEYS;
}

exports.ROOT_URL = ROOT_URL;
exports.BLOCKED_TLDS = BLOCKED_TLDS;
exports.CRYPTO_KEYS = CRYPTO_KEYS;
exports.DELETE_COMPLETED = DELETE_COMPLETED;
exports.DELETE_FAILED = DELETE_FAILED;
exports.DELETE_SERVER_DATA = DELETE_SERVER_DATA;
exports.FLUSH_SIZE = FLUSH_SIZE;
exports.FS_CONST = FS_CONST;
exports.STUDY_END_DATE = STUDY_END_DATE;
exports.TAB_SESSION_COMPLETE = TAB_SESSION_COMPLETE;
exports.UNINSTALL_ADDON = UNINSTALL_ADDON;
exports.UnderTest = underTest;
