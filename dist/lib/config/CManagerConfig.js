"use strict";
const path = require("path");
const fs = require("fs");
const Url = require("url");
const HttpsProxyAgent = require("https-proxy-agent");
const Tunnel = require("tunnel");
const CKnapsackConfig = require("./CKnapsackConfig");
const CMarketConfig = require("./CMarketConfig");
const CSocketsConfig = require("./CSocketsConfig");
const CBadOffersConfig = require("./CBadOffersConfig");
module.exports = CManagerConfig;
/**
 * @param {Object} opts
 * @param {String?} [proxy]
 * @constructor
 */
function CManagerConfig(opts, proxy = null) {
    this.proxy = proxy;
    let config = opts.manager || {};
    this.balanceValidationInterval = Number(config.balanceValidationInterval || 1.5 * 60 * 1000);
    this.avoidBadBots = typeof config.avoidBadBots !== "undefined" ? Boolean(config.avoidBadBots) : false;
    this.safeBuyRequests = typeof config.safeBuyRequests !== "undefined" ? Boolean(config.safeBuyRequests) : false;
    this.logApiCalls = config.logApiCalls ? config.logApiCalls : false;
    this.dataDir = null;
    if (config.dataDir) {
        if (!path.isAbsolute(config.dataDir)) {
            throw new Error("Invalid config: dataDir should be absolute path");
        }
        this.dataDir = config.dataDir;
        if (!fs.existsSync(this.dataDir)) {
            fs.mkdirSync(this.dataDir);
        }
    }
    this.market = new CMarketConfig(opts.market || {}, this.getHttpsProxy());
    this.sockets = new CSocketsConfig(opts.sockets || {}, this.getWsProxy());
    this.knapsack = new CKnapsackConfig(opts.knapsack || {});
    this.badOffers = new CBadOffersConfig(opts.badOffers || {});
}
CManagerConfig.prototype.getWsProxy = function (opts = {}) {
    if (!this.proxy) {
        return null;
    }
    return new HttpsProxyAgent(this._parseProxyUrl(this.proxy, opts));
};
CManagerConfig.prototype.getHttpsProxy = function (opts = {}) {
    if (!this.proxy) {
        return null;
    }
    let p = this._parseProxyUrl(this.proxy, opts);
    return Tunnel.httpsOverHttp({
        proxy: {
            host: p.hostname,
            port: p.port,
            proxyAuth: p.auth,
        }
    });
};
CManagerConfig.prototype._parseProxyUrl = function (url, opts) {
    return Object.assign({}, Url.parse(url), opts);
};
