"use strict";

const CKnapsackConfig = require("./CKnapsackConfig");
const CMarketConfig = require("./CMarketConfig");
const CSocketsConfig = require("./CSocketsConfig");

module.exports = CManagerConfig;

/**
 * @param {Object} opts
 * @param {console} [logger]
 * @constructor
 */
function CManagerConfig(opts, logger = null) {
    /** @var {HttpsProxyAgent?} */
    this.proxy = opts.proxy || null;

    this.knapsack = new CKnapsackConfig(opts.knapsack);
    this.market = new CMarketConfig(opts.market);
    this.sockets = new CSocketsConfig(opts.sockets);

    this.logger = logger || console;
}
