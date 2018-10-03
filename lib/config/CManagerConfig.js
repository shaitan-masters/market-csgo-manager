"use strict";

const path = require("path");
const fs = require("fs");

const CKnapsackConfig = require("./CKnapsackConfig");
const CMarketConfig = require("./CMarketConfig");
const CSocketsConfig = require("./CSocketsConfig");

module.exports = CManagerConfig;

/**
 * @param {Object} opts
 * @param {HttpsProxyAgent?} [proxy]
 * @constructor
 */
function CManagerConfig(opts, proxy = null) {
    this.proxy = proxy;

    let config = opts.manager || {};

    this.balanceValidationInterval = Number(config.balanceValidationInterval || 1.5 * 60 * 1000);
    this.avoidBadBots = typeof config.avoidBadBots !== "undefined" ? Boolean(config.avoidBadBots) : true;
    this.safeBuyRequests = typeof config.safeBuyRequests !== "undefined" ? Boolean(config.safeBuyRequests) : false;
    this.logApiCalls = config.logApiCalls ? config.logApiCalls : false;

    this.dataDir = null;
    if(config.dataDir) {
        if(!path.isAbsolute(config.dataDir)) {
            throw new Error("Invalid config: dataDir should be absolute path");
        }

        this.dataDir = config.dataDir;
        if(!fs.existsSync(this.dataDir)) {
            fs.mkdirSync(this.dataDir);
        }
    }

    this.market = new CMarketConfig(opts.market || {}, this.proxy);
    this.sockets = new CSocketsConfig(opts.sockets || {}, this.proxy);
    this.knapsack = new CKnapsackConfig(opts.knapsack || {});
}
