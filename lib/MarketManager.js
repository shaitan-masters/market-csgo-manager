"use strict";

const EventEmitter = require("events").EventEmitter;

const MarketLayer = require("../market/MarketLayer");
const MarketSockets = require("../market/MarketSockets");
const MarketKnapsack = require("./MarketKnapsack");

const BadOffersCache = require("./BadOffersCache");
const ESocketEvent = require("../market/enums/ESocketEvent");
const FnExtensions = require("../modules/FnExtensions");

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
    this._config = config;

    this.layer = new MarketLayer(config.market, _logger);
    this.ws = new MarketSockets(config.sockets, this.layer, _logger);
    this.knapsack = new MarketKnapsack(config.knapsack, this.layer, this.ws, _logger);

    this.started = false;

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

    this.ws.on(ESocketEvent.Connected, () => logger.log("Connected to market websockets"));
    this.ws.on(ESocketEvent.Auth, () => logger.log("Authorized in market websockets"));
    this.ws.on(ESocketEvent.DeAuth, () => logger.log("Deauthorized from market websockets"));
    this.ws.on(ESocketEvent.Stuck, () => logger.log("Market websockets stuck. Reconnecting"));

    //FnExtensions.setWatcher(this.requestBalanceUpdate, this._config.balanceValidationInterval, this);
};

MarketManager.prototype.buy = function(hashName, goodPrice, partnerId, tradeToken) {
    // todo: если получили в ответ http ошибку, то проверять по истории операций, что предмет не был куплен

    // todo: пытаться исключить плохие лоты из списка для покупки
};

/**
 * @param {MarketKnapsack} knapsack
 */
function setKnapsackEvents(knapsack) {
    knapsack.on("updated", () => {
        self.emit("knapsackUpdate", [knapsack.pendingItemsCount, knapsack.takeItemsCount]);
    });
}

require("./ManagerBalanceUpdater");
require("./ManagerAutoPayments");
