"use strict";

module.exports = CKnapsackConfig;

/**
 * @param {Object} opts
 * @param {HttpsProxyAgent?} proxy
 * @constructor
 */
function CKnapsackConfig(opts, proxy = null) {
    this.minBalanceUpdateInterval = Number(opts.balanceUpdateInterval || 1.5 * 60 * 1000);
    this.instantTake = typeof opts.instantTake !== "undefined" ? Boolean(opts.instantTake) : true;

    this.proxy = proxy;
}
