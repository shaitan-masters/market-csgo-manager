"use strict";

module.exports = CSocketsConfig;

/**
 * @param {Object} opts
 * @param {HttpsProxyAgent?} proxy
 * @constructor
 */
function CSocketsConfig(opts, proxy = null) {
    this.pingInterval = Number(opts.pingInterval || 20 * 1000); // We need to ping TM every 3 minutes; 5 seconds margin cause TM is silly

    this.proxy = proxy;
}
