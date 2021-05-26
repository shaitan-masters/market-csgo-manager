"use strict";
const WS_URL = "wss://wsnn.dota2.net/wsn/";
module.exports = CSocketsConfig;
/**
 * @param {Object} opts
 * @param {String} opts.basePath
 * @param {Number} opts.pingInterval
 * @param {HttpsProxyAgent?} proxy
 * @constructor
 */
function CSocketsConfig(opts, proxy = null) {
    this.basePath = opts.basePath || WS_URL;
    this.pingInterval = Number(opts.pingInterval || 20 * 1000); // We need to ping TM every 3 minutes; 5 seconds margin cause TM is silly
    this.proxy = proxy;
}
