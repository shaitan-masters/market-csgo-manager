"use strict";

const UNSAFE_HTTP_CODES = [500, 520];

const EventEmitter = require("events").EventEmitter;

const MarketLayer = require("../market/MarketLayer");
const MarketSockets = require("../market/MarketSockets");
const MarketKnapsack = require("./MarketKnapsack");

const MiddlewareError = require("../market/classes/MiddlewareError");
const BadOffersCache = require("./BadOffersCache");
const EKnapsackEvent = require("./enums/EKnapsackEvent");
const ESocketEvent = require("../market/enums/ESocketEvent");
const EErrorSource = require("../market/enums/EErrorSource");
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
 */
function MarketManager(config, _logger = console) {
    this._config = config;
    logger = _logger;

    this.started = false;

    this.layer = new MarketLayer(config.market, _logger);
    this.ws = new MarketSockets(config.sockets, this.layer, _logger);
    this.knapsack = new MarketKnapsack(config.knapsack, this.layer, this.ws, _logger);

    this._badOffers = new BadOffersCache();

    this._wallet = 0;
}

MarketManager.prototype.start = function() {
    if(this.started) {
        return;
    }
    this.started = true;

    this.layer.start();
    this.ws.start();

    this.knapsack.start();
    this._badOffers.start();

    this.ws.on(ESocketEvent.Connected, () => logger.log("Connected to market websockets"));
    this.ws.on(ESocketEvent.Auth, () => logger.log("Authorized in market websockets"));
    this.ws.on(ESocketEvent.DeAuth, () => logger.log("Deauthorized from market websockets"));
    this.ws.on(ESocketEvent.Stuck, () => logger.log("Market websockets stuck. Reconnecting.."));

    this._knapsackBadOffersSubscribe();
    this._startBalanceUpdater();
};

MarketManager.prototype.buy = function(hashName, goodPrice, partnerId, tradeToken) {
    let tradeData = this.layer.tradeData(partnerId, tradeToken);

    return this.layer.getItemOffers(hashName, goodPrice).then((offers) => {
        if(this._config.avoidBadBots) {
            return this._buyAndAvoid(offers, tradeData);
        }

        return this.layer.buyCheapest(offers, tradeData);
    }).catch((err) => {
        // todo: Если получили в ответ http ошибку, то проверять по истории операций, что предмет не был куплен
        if(this._config.safeBuyRequests && err.statusCode && UNSAFE_HTTP_CODES.includes(err.statusCode)) {
            return this.layer.getBoughtItems(new Date(), 20 * 1000).then((events) => {
                // todo
            }).catch((err2) => {
                throw err;
            });
        }

        throw err;
    });
};

MarketManager.prototype._buyAndAvoid = function(offers, tradeData) {
    let goodOffers = offers.filter((el) => !this._badOffers.isBad(el));
    let shouldTryOnce = goodOffers.length === offers.length;

    return this.layer.buyCheapest(goodOffers, tradeData).catch((err) => {
        if(!shouldTryOnce && err instanceof MiddlewareError && err.source !== EErrorSource.User) {
            return this.layer.buyCheapest(offers, tradeData);
        }

        throw err;
    });
};

MarketManager.prototype._knapsackBadOffersSubscribe = function() {
    this.knapsack.on(EKnapsackEvent.ItemExpired, (item) => {
        if(this._config.avoidBadBots) {
            this._badOffers.markAsBad(item);
        }
    });
};

require("./ManagerBalanceUpdater");
require("./ManagerAutoPayments");
