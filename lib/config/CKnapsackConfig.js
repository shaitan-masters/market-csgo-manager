"use strict";

module.exports = CKnapsackConfig;

/**
 * @param {Object} opts
 * @param {HttpsProxyAgent?} proxy
 * @constructor
 */
function CKnapsackConfig(opts, proxy = null) {
    this.instantTake = typeof opts.instantTake !== "undefined" ? Boolean(opts.instantTake) : true;

    this.validationInterval = 0;
    this.updateInterval = 0;

    this.proxy = proxy;
}
