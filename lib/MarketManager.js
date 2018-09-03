"use strict";

const EventEmitter = require("events").EventEmitter;

const MarketLayer = require("../market/MarketLayer");
const MarketSockets = require("../market/MarketSockets");
const MarketKnapsack = require("../market/MarketKnapsack");

module.exports = MarketManager;
require("util").inherits(MarketManager, EventEmitter);

/**
 * @param opts
 * @property {String} opts.apiKey
 * @property {Number} [opts.pingInterval]
 * @property {Number} [opts.wsPingInterval]
 * @property {HttpsProxyAgent} [opts.proxy]
 * @property {console} [opts.logger]
 * @constructor
 * @extends {EventEmitter}
 */
function MarketManager(opts) {
    // todo
}

/**
 * @param {MarketKnapsack} knapsack
 */
function setKnapsackEvents(knapsack) {
    knapsack.on("updated", () => {
        self.emit("knapsackUpdate", [knapsack.pendingItemsCount, knapsack.takeItemsCount]);
    });
}
