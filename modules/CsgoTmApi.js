"use strict";

const parseUrl = require("url").parse;
const fs = require("fs");

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
require("util").inherits(TMCustomAPI, CSGOtm.API);
// Inherits static methods/properties
let skipList = ["length", "name", "prototype"];
Object.getOwnPropertyNames(CSGOtm.API).forEach((prop) => {
    if(!skipList.includes(prop)) {
        TMCustomAPI[prop] = CSGOtm.API[prop];
    }
});

let errorPath;

/**
 * @extends {CSGOtmAPI}
 * @inheritDoc {CSGOtmAPI}
 *
 * @param {String} [options.htmlAnswerLogPath=null] - path, where HTML answers from API would be saved
 * @param {Boolean} [options.extendedError=true]
 * @param {Function} [options.registerError]
 */
function TMCustomAPI(options) {
    options.extendedError = true;

    // Adds trailing slash
    if(options.htmlAnswerLogPath) {
        if(!options.htmlAnswerLogPath.endsWith("/")) {
            options.htmlAnswerLogPath += "/";
        }

        errorPath = options.htmlAnswerLogPath;
    }

    if(options.registerError) {
        this._registerError = options.registerError;
    }

    TMCustomAPI.super_.apply(this, arguments);
}

/**
 * JSON request. Here we add html error capturing
 *
 * @param {String} url
 * @param {Object} [gotOptions] Options for 'got' module
 *
 * @returns {Promise}
 */
CSGOtm.API.requestJSON = function(url, gotOptions = {}) {
    return TMCustomAPI.requestJSON(url, gotOptions).catch(error => {
        let response = error.response || error.nested.response || null;

        if(!(error instanceof CSGOtm.CSGOtmAPIError) && typeof response.body === "string" && errorPath) {
            try {
                JSON.parse(response.body);
            } catch(e) {
                let parsedUrl = parseUrl(url);

                let urlPath = parsedUrl.pathname.replace(/^\/|\/$/g, "").replace(/[\s]/, "_").replace(/\//g, "_");
                let dateString = new Date().toISOString();
                let fileName = `${urlPath}_${dateString}.html`;

                fs.writeFile(errorPath + fileName, response.body, (err) => {
                    if(err) {
                        console.log("Failed to save html answer from tm", err);
                    }
                });
            }
        }

        // wrapped into try/catch because of "cannot delete property 'response' of HTTPError"
        try {
            delete error.response;
            delete error.gotOptions;
        } catch(e) {
        }

        if(this._registerError) {
            setTimeout(() => {
                this._registerError(error);
            }, 0);
        }

        throw error;
    });
};
