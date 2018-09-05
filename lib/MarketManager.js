"use strict";

const EventEmitter = require("events").EventEmitter;

const MarketLayer = require("../market/MarketLayer");
const MarketSockets = require("../market/MarketSockets");
const MarketKnapsack = require("./MarketKnapsack");

/** @interface {console} */
let logger;

module.exports = MarketManager;
require("util").inherits(MarketManager, EventEmitter);

/**
 * Manages: initialization, high lever interface, balance, [market status,]
 *
 * @param {CManagerConfig} config
 * @param {console} [_logger]
 * @constructor
 * @extends {EventEmitter}
 * @todo
 */
function MarketManager(config, _logger = console) {
    this.started = false;

    this.layer = new MarketLayer(config.market, _logger);
    this.ws = new MarketSockets(config.sockets, this.layer, _logger);
    this.knapsack = MarketKnapsack(config.knapsack, this.layer, this.ws, _logger);

    logger = _logger;
}

MarketManager.prototype.start = function() {
    if(this.started) {
        return;
    }
    this.started = true;

    this.layer.start();
    this.ws.start();

    this.knapsack.start();
};

/**
 * @param {MarketKnapsack} knapsack
 */
function setKnapsackEvents(knapsack) {
    knapsack.on("updated", () => {
        self.emit("knapsackUpdate", [knapsack.pendingItemsCount, knapsack.takeItemsCount]);
    });
}
