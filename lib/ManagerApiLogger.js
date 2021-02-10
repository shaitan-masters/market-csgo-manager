"use strict";

const fs = require("fs");
const tracer = require("tracer");

const MarketManager = require("./MarketManager");

/**
 * @memberof MarketManager
 */
MarketManager.prototype._enableApiLog = function() {
    let log = this._getLogObj();

    this.layer.api.events.on("_apiCall", (url, id, data) => {
        let keyRegExp = new RegExp(`([?&])(key=${this.layer._config.apiKey}&?)`, "ig");

        url = decodeURIComponent(url); // decode url
        url = url.replace(keyRegExp, "$1"); // remove api key
        url = url.replace(/(\/\??)$/, ""); // remove trailing `/`, and trailing `/?`

        if(data) {
            log.trace("[%d] -> %s %j", id, url, data);
        } else {
            log.trace("[%d] -> %s", id, url);
        }
    });

    this.layer.api.events.on("_apiResponse", (data, id) => {
        log.debug("[%d] <- %j", id, data);
    });
};

/**
 * @memberof MarketManager
 */
MarketManager.prototype._getLogObj = function() {
    let logPrefix = "all_logs";

    let logConf = this._config.logApiCalls;
    if(typeof logConf === "object" && logConf !== null) {
        return logConf;
    }
    if(typeof logConf === "string" && logConf.length > 0) {
        logPrefix = logConf;
    }

    let logPath = this.__getDataPath("tm_calls");
    if(!fs.existsSync(logPath)) {
        fs.mkdirSync(logPath);
    }

    return tracer.dailyfile({
        root: logPath,
        maxLogFiles: 30,
        allLogsFileName: logPrefix,
        format: [
            "<{{timestamp}}> {{message}}",
        ],
        dateformat: "yyyy-mm-dd HH:MM:ss.L",
    });
};
