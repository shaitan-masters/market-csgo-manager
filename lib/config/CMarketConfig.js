"use strict";

const path = require("path");

module.exports = CMarketConfig;

/**
 * @param {Object} opts
 * @param {HttpsProxyAgent?} proxy
 * @constructor
 */
function CMarketConfig(opts, proxy = null) {
    this.apiKey = opts.apiKey;

    this.pingInterval = Number(opts.pingInterval || (3 * 60 * 1000 + 5 * 1000)); // We need to ping TM every 3 minutes; 5 seconds margin cause TM is silly

    if(typeof opts.errorLogDir !== "undefined") {
        this.errorLogPath = path.normalize(path.resolve(opts.errorLogDir));
    } else {
        this.errorLogPath = null;
    }

    this.price = {
        fluctuation: Number(opts.allowedPriceFluctuation || 0),
        compromiseFactor: Number(opts.compromiseFactor || 0),
        minCompromise: Number(opts.minCompromise || 30 * 100),
    };

    this.proxy = proxy;
}

CMarketConfig.prototype.preparePrice = function(price) {
    let allowedPrice = price * (1 + this.price.fluctuation);
    let compromise = Math.max(price * this.price.compromiseFactor, this.price.minCompromise);

    return allowedPrice + compromise;
};
