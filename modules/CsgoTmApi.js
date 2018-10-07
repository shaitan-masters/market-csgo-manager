"use strict";

const parseUrl = require("url").parse;
const util = require("util");
const fs = require("fs");
const EventEmitter = require("events").EventEmitter;

const CSGOtm = require("@malsa/node-csgotm-api");
const CSGOtmAPI = CSGOtm.API;

/**
 * Used as workaround of
 * https://github.com/Xfaider48/node-csgotm-api/pull/4 and
 * https://github.com/Xfaider48/node-csgotm-api/pull/5
 *
 * Currently there is no need in this wrapper,
 * but I will leave it for future bugs and unnecessary functional extensions
 */

module.exports = TMCustomAPI;
module.exports.CSGOtmAPIError = CSGOtm.CSGOtmAPIError;

// Inheritance
util.inherits(TMCustomAPI, CSGOtm.API);

// Inherits static methods/properties
let skipList = ["length", "name", "prototype"];
Object.getOwnPropertyNames(CSGOtm.API).forEach((prop) => {
    if(!skipList.includes(prop)) {
        TMCustomAPI[prop] = CSGOtm.API[prop];
    }
});

let __extendedError;
let errorPath;
let requestID = -1;

let events = new EventEmitter();

/**
 * @extends {CSGOtmAPI}
 * @inheritDoc {CSGOtmAPI}
 *
 * @param {Object} options
 * @property {String} [options.htmlAnswerLogPath=null] - path, where HTML answers from API would be saved
 */
function TMCustomAPI(options) {
    __extendedError = options.extendedError;
    options.extendedError = true; // we need it for HTML error logging

    // Adds trailing slash
    if(options.htmlAnswerLogPath) {
        if(!options.htmlAnswerLogPath.endsWith("/")) {
            options.htmlAnswerLogPath += "/";
        }

        errorPath = options.htmlAnswerLogPath;
        if(!fs.existsSync(errorPath)) {
            fs.mkdirSync(errorPath);
        }
    }

    this.events = events;

    TMCustomAPI.super_.apply(this, arguments);
}

/**
 * JSON request execution.
 * Here we add html error capturing event capturing.
 *
 * @param {String} url
 * @param {Object} [gotOptions] Options for 'got' module
 *
 * @returns {Promise}
 */
CSGOtm.API.requestJSON = function(url, gotOptions = {}) {
    requestID++;
    events.emit("_apiCall", url, requestID);

    return TMCustomAPI.requestJSON(url, gotOptions).then((data) => {
        events.emit("_apiResponse", data, requestID);

        return data;
    }).catch(error => {
        let response = error.response || error.nested.response || null;

        if(!(error instanceof CSGOtm.CSGOtmAPIError) && typeof response.body === "string" && errorPath) {
            try {
                JSON.parse(response.body);
            } catch(e) {
                // This is HTML page

                let urlPath = parseUrl(url).pathname.replace(/^\/|\/$/g, "").replace(/[\s\/]/g, "_");
                let dateString = new Date().toISOString();

                let fileName = `${urlPath}_${dateString}.html`;
                fs.writeFile(errorPath + fileName, response.body, (err) => {
                    if(err) {
                        console.log("Failed to save html answer from TM", err);
                    }
                });
            }
        }

        if(!__extendedError) {
            // wrapped into try/catch because of "cannot delete property 'response' of HTTPError"
            try {
                delete error.response;
                delete error.gotOptions;
            } catch(e) {
            }
        }

        events.emit("_error", error, requestID);

        throw error;
    });
};
