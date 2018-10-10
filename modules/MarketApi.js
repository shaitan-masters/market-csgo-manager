"use strict";

const parseUrl = require("url").parse;
const fs = require("fs");
const EventEmitter = require("events").EventEmitter;

const MarketApi = require("market-csgo-api");
const MarketApiError = MarketApi.MarketApiError;

/**
 * @extends {MarketApi}
 */
class MarketCustomApi extends MarketApi {
    /**
     * @inheritDoc
     * @property {String} [options.htmlAnswerLogPath=null] - path, where HTML answers from API would be saved
     */
    constructor(options) {
        let __extendedError = options.extendedError;
        let errorPath = null;

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

        super(options);

        this.events = new EventEmitter();
        this._requestId = 0;

        this._errorPath = errorPath;
        this.__extendedError = __extendedError;
    }

    requestJsonHook(url, gotOptions = null) {
        let currentID = this._requestId++;
        let postData = gotOptions && gotOptions.form ? gotOptions.body : null;

        this.events.emit("_apiCall", url, currentID, postData);

        return super.requestJsonHook(url, gotOptions).then((data) => {
            this.events.emit("_apiResponse", data, currentID);

            return data;
        }).catch((error) => {
            let isApiError = error instanceof MarketApiError;

            let response = error.response || null;
            let body = response.body || null;

            if(isApiError) {
                this.events.emit("_apiResponse", body, currentID);
            }

            if(!isApiError && typeof body === "string" && this._errorPath) {
                try {
                    JSON.parse(body);
                } catch(e) {
                    // This is HTML page

                    let urlPath = parseUrl(url).pathname.replace(/^\/|\/$/g, "").replace(/[\s\/]/g, "_");
                    let dateString = new Date().toISOString();

                    let fileName = `${urlPath}_${dateString}.html`;
                    fs.writeFile(this._errorPath + fileName, body, (err) => {
                        if(err) {
                            console.log("Failed to save html answer from TM", err);
                        }
                    });
                }
            }

            if(!this.__extendedError) {
                // wrapped into try/catch because of "cannot delete property 'response' of HTTPError"
                try {
                    delete error.response;
                    delete error.gotOptions;
                } catch(e) {
                }
            }

            this.events.emit("_error", error, currentID, isApiError);

            throw error;
        });
    }
};

module.exports = MarketCustomApi;
module.exports.CSGOtmAPIError = MarketApiError;
