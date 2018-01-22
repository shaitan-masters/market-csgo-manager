"use strict";

const parseUrl = require("url").parse;
const fs = require("fs");

/**
 * Used as workaround of
 * https://github.com/Xfaider48/node-csgotm-api/pull/4 and
 * https://github.com/Xfaider48/node-csgotm-api/pull/5
 *
 * Currently there is no need in this wrapper, but I will leave it for future bugs
 */

const CSGOtm = require("node-csgotm-api");

/** @type {CSGOtmAPI} */
const API = CSGOtm.API;

module.exports = TMCustomAPI;

require("util").inherits(TMCustomAPI, CSGOtm.API);
// Inherits static methods/properties
let skipList = ["length", "name", "prototype"];
Object.getOwnPropertyNames(CSGOtm.API).forEach((prop) => {
    if(!skipList.includes(prop)) {
        TMCustomAPI[prop] = CSGOtm.API[prop];
    }
});

/**
 * @type {CSGOtmAPI}
 *
 * @param {String}     [options.htmlAnswerLogPath=null] Path, where HTML answers from API would be saved
 */
function TMCustomAPI(options) {
    TMCustomAPI.super_.apply(this, arguments);

    // Adds trailing slash
    if(options.htmlAnswerLogPath) {
        if(!options.htmlAnswerLogPath.endsWith("/")) {
            options.htmlAnswerLogPath += "/";
        }
    }

    this.options.htmlAnswerLogPath = options.htmlAnswerLogPath || null;
}

/**
 * JSON request
 *
 * @param {String} url
 * @param {String} [errorSavePath=null]
 * @param {Object} [gotOptions] Options for 'got' module
 *
 * @returns {Promise}
 */
TMCustomAPI.requestJSON = function(url, errorSavePath = null, gotOptions = {}) {
    return CSGOtm.API.requestJSON(url, gotOptions).catch(error => {
        if(error.nested.response && errorSavePath) {
            try {
                JSON.parse(error.nested.response.body);
            } catch(e) {
                let parsedUrl = parseUrl(url);

                let urlPath = parsedUrl.pathname.replace(/^\/|\/$/g, "").replace(/[\s]/, "_").replace("/", "_");
                let dateString = new Date().toISOString();
                let fileName = `${urlPath}_${dateString}.html`;

                fs.writeFile(errorSavePath + fileName, error.nested.response.body, (err) => {
                    if(err) {
                        console.log("Failed to save html answer from tm", err);
                    }
                });
            }
        }

        throw error;
    });
};

/**
 * Simple API call with key
 *
 * @param {String} method
 * @param {Object} [gotOptions] Options for 'got' module
 *
 * @returns {Promise}
 */
TMCustomAPI.prototype.callMethodWithKey = function(method, gotOptions = {}) {
    let url = `${this.apiUrl}/${encodeURI(method)}/?key=${this.options.apiKey}`;
    if(!Object.keys(gotOptions).length) {
        gotOptions = this.options.defaultGotOptions;
    }

    return this.limitRequest(() => {
        return TMCustomAPI.requestJSON(url, this.options.htmlAnswerLogPath, gotOptions);
    });
};
