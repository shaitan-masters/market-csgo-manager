"use strict";

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

    this.market = new CMarketConfig(opts.market || {}, this.proxy);
    this.sockets = new CSocketsConfig(opts.sockets || {}, this.proxy);
    this.knapsack = new CKnapsackConfig(opts.knapsack || {}, this.proxy);

    this.balanceValidationInterval = Number(opts.balanceValidationInterval || 1.5 * 60 * 1000);
}
