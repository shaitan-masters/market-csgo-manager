"use strict";
const path = require("path");
module.exports = CMarketConfig;
/**
 * @param {Object} opts
 * @property {String} opts.apiKey
 * @property {Number} opts.pingInterval
 * @property {Number} opts.discountUpdateInterval
 * @property {Number} opts.allowedPriceFluctuation
 * @property {Number} opts.compromiseFactor
 * @property {Number} opts.minCompromise
 * @property {Boolean} opts.handleTimezone
 * @property {Boolean} opts.hackExpiredOffers
 * @property {Boolean} opts.applyDiscounts
 * @param {http.Agent?} proxy
 *
 * @constructor
 */
function CMarketConfig(opts, proxy = null) {
    this.apiKey = opts.apiKey;
    this.pingInterval = Number(opts.pingInterval || (3 * 60 * 1000 + 5 * 1000)); // We need to ping TM every 3 minutes; 5 seconds margin cause TM is silly
    this.discountUpdateInterval = Number(opts.discountUpdateInterval || (60 * 60 * 1000));
    this.errorLogPath = null;
    this.price = {
        fluctuation: Number(opts.allowedPriceFluctuation || 0),
        compromiseFactor: Number(opts.compromiseFactor || 0),
        minCompromise: Number(opts.minCompromise || 0),
    };
    this.handleTimezone = typeof opts.handleTimezone !== "undefined" ? Boolean(opts.handleTimezone) : false;
    this.hackExpiredOffers = typeof opts.hackExpiredOffers !== "undefined" ? Boolean(opts.hackExpiredOffers) : false;
    this.applyDiscounts = typeof opts.applyDiscounts !== "undefined" ? Boolean(opts.applyDiscounts) : false;
    this.proxy = proxy;
}
CMarketConfig.prototype.setErrorPath = function (dirPath) {
    this.errorLogPath = path.normalize(path.resolve(dirPath));
};
CMarketConfig.prototype.preparePrice = function (price) {
    let allowedPrice = price * (1 + this.price.fluctuation);
    let compromise = Math.max(price * this.price.compromiseFactor, this.price.minCompromise);
    let priceCap = allowedPrice + compromise;
    //console.log("allowedPrice", allowedPrice, "compromise", compromise, "max", priceCap);
    return priceCap;
};
