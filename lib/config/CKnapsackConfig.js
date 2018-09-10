"use strict";

module.exports = CKnapsackConfig;

/**
 * @param {Object} opts
 * @param {HttpsProxyAgent?} proxy
 * @constructor
 */
function CKnapsackConfig(opts, proxy = null) {
    this.instantTake = typeof opts.instantTake !== "undefined" ? Boolean(opts.instantTake) : true;

    this.validationInterval = opts.validationInterval || 60 * 1000;
    this.updateInterval = opts.updateInterval || 20 * 1000;

    this.proxy = proxy;
}
