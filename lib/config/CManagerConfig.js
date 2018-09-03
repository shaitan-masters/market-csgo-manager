"use strict";

const CKnapsackConfig = require("./CKnapsackConfig");
const CMarketConfig = require("./CMarketConfig");

module.exports = CManagerConfig;

/**
 * @param {Object} opts
 * @param {console} [logger]
 * @constructor
 */
function CManagerConfig(opts, logger = null) {
    /** @var {HttpsProxyAgent?} */
    this.proxy = opts.proxy || null;

    this.wsPingInterval = Number(opts.wsPingInterval || 20 * 1000);

    this.knapsack = new CKnapsackConfig(opts.knapsack);

    this.market = new CMarketConfig(opts.market);

    this.logger = logger || console;
}
