"use strict";

const fs = require("fs");
const tracer = require("tracer");

const MarketManager = require("./MarketManager");

MarketManager.prototype._enableApiLog = function() {
    let log = this._getLogObj();

    this.layer.api.events.on("_apiCall", (url) => {
        url = unescape(url); // decode url
        url = url.replace(/([?&])(key=[a-z0-9]*&?)/ig, "$1key=.."); // remove api key
        // url = url.replace(/(\/\??)$/, ""); // remove trailing `/`, and trailing `/?`

        log.log(url);
    });
};

MarketManager.prototype._getLogObj = function() {
    let logPath = this.__getDataPath("tm_calls");

    let logConf = this._config.logApiCalls;
    if(typeof logConf === "object" && logConf !== null) {
        return logConf;
    }
    if(typeof logConf === "string" && logConf.length > 0) {
        logPath = this.__getDataPath(logConf);
    }

    if(!fs.existsSync(logPath)) {
        fs.mkdirSync(logPath);
    }

    return tracer.dailyfile({
        root: logPath,
        maxLogFiles: 30,
        allLogsFileName: "all_logs",
        format: [
            "<{{timestamp}}> {{message}}",
        ],
        dateformat: "yyyy-mm-dd HH:MM:ss.L",
    });
};
