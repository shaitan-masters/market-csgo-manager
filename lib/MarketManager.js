"use strict";

const UNSAFE_HTTP_CODES = [500, 520, 527];

const path = require("path");
const EventEmitter = require("events").EventEmitter;

const MarketLayer = require("../market/MarketLayer");
const MarketSockets = require("../market/MarketSockets");
const MarketKnapsack = require("./MarketKnapsack");

const MiddlewareError = require("../market/classes/MiddlewareError");
const BadOffersCache = require("./BadOffersCache");

const EManagerEvent = require("./enums/EManagerEvent");
const EKnapsackEvent = require("./enums/EKnapsackEvent");
const ESocketEvent = require("../market/enums/ESocketEvent");
const EErrorSource = require("../market/enums/EErrorSource");
const EErrorType = require("../market/enums/EErrorType");
const EMarketEventStage = require("../market/enums/system/EMarketEventStage");

module.exports = MarketManager;
require("util").inherits(MarketManager, EventEmitter);

/**
 * Manages: initialization, high lever interface, balance, [market status,]
 *
 * @param {CManagerConfig} config
 * @param {Console} [_logger]
 * @constructor
 * @extends {EventEmitter}
 */
function MarketManager(config, _logger = console) {
    this._config = config;

    /** @type {Console} */
    this._log = _logger;

    this.started = false;

    if(this._config.dataDir) {
        let errorLog = this.__getDataPath("tm_errors");
        config.market.setErrorPath(errorLog);
    }

    this.layer = new MarketLayer(config.market, _logger);
    this.ws = new MarketSockets(config.sockets, this.layer, _logger);
    this.knapsack = new MarketKnapsack(config.knapsack, this.layer, this.ws, _logger);

    if(this._config.logApiCalls) {
        this._enableApiLog();
    }

    this._badOffers = new BadOffersCache(config.badOffers);

    this._currency = null;
    this._wallet = null;
}

MarketManager.prototype.start = async function() {
    if(this.started) {
        return;
    }
    this.started = true;

    this._log.trace("Starting manager");

    this._setWsEvents();

    this.layer.start();
    await this.ws.start();

    await this.updateWallet();
    this.knapsack.start();
    this._badOffers.start();

    this._knapsackBadOffersSubscribe();
    this._startBalanceUpdater();
};

MarketManager.prototype.buy = function(hashName, goodPrice, partnerId, tradeToken, customId) {
    let tradeData;
    if(typeof partnerId === "object" && !tradeToken) {
        tradeData = partnerId;
    } else {
        tradeData = this.layer.tradeData(partnerId, tradeToken);
    }

    return this.layer.getItemOffers(hashName, goodPrice).then((offers) => {
        if(this._config.avoidBadBots) {
            return this._buyAndAvoid(offers, tradeData);
        }

        return this.layer.buyCheapest(offers, tradeData, customId);
    }).then((item) => {
        this._changeBalance(-item.price);

        return item;
    }).catch((err) => {
        // todo: Если получили в ответ http ошибку, то проверять по истории операций, что предмет не был куплен
        if(this._config.safeBuyRequests && err.statusCode && UNSAFE_HTTP_CODES.includes(err.statusCode)) {
            return this.layer.getBoughtItems(new Date(), 20 * 1000).then((items) => {
                // todo
                console.log("TODO: add safeBuyRequests code", err.statusCode, items, err.instance);

                let boughtItem = items.filter((item) => {
                    return 0;
                });
            }).catch((err2) => {
                throw err;
            });
        }
        if(err instanceof MiddlewareError && err.type === EErrorType.NeedMoney) {
            this.emit(EManagerEvent.NeedMoney, err.needMoney);
        }

        throw err;
    });
};

MarketManager.prototype.massItemStatus = async function(items, margin = 15 * 60 * 1000) {
    let statuses = {};

    while(Object.keys(items).length) {
        let itemId = Object.keys(items).pop();
        let itemDate = items[itemId];

        let foundItems;
        try {
            let boughtItems = await this.layer.getBoughtItems(itemDate, margin);
            foundItems = boughtItems.filter((ev) => Object.keys(items).includes(String(ev.item_id)));
        } catch(err) {
            if(err instanceof MiddlewareError && err.type === EErrorType.NotFound) {
                foundItems = [];
            } else {
                throw err;
            }
        }

        foundItems.forEach((ev) => {
            let marketId = String(ev.item_id);

            let stage = Number(ev.stage);
            if(EMarketEventStage.has(stage)) {
                statuses[marketId] = stage;
            } else {
                this._log.error("Unknown market item#" + marketId + " operation stage", stage);
            }

            delete items[marketId];
        });

        // Support for wrong items
        if(items[itemId]) {
            statuses[itemId] = null;
            delete items[itemId];
        }
    }

    return statuses;
};

MarketManager.prototype._buyAndAvoid = async function(offers, tradeData) {
    let goodOffers = offers.filter((el) => !this._badOffers.isBad(el));
    let otherOffers = offers.filter((el) => this._badOffers.isBad(el));

    try {
        let bought = await this.layer.buyCheapest(goodOffers, tradeData);

        this._badOffers.storeBoughtOffer(bought);

        return bought;
    } catch(e) {
        if(otherOffers.length && e instanceof MiddlewareError && e.source !== EErrorSource.User) {
            return await this.layer.buyCheapest(otherOffers, tradeData);
        }

        throw e;
    }
};

MarketManager.prototype._setWsEvents = function() {
    this.ws.on(ESocketEvent.Connected, () => {
        this._log.log("Connected to market websockets");
    });

    this.ws.on(ESocketEvent.Auth, () => {
        this._log.log("Authorized in market websockets");

        this.layer.pingEnabled = false;
    });
    this.ws.on(ESocketEvent.DeAuth, () => {
        this._log.log("Deauthorized from market websockets");

        this.layer.pingEnabled = true;
    });

    this.ws.on(ESocketEvent.Stuck, () => {
        this._log.log("Market websockets stuck. Reconnecting..");

        this.ws.reconnect();
    });
};

MarketManager.prototype._knapsackBadOffersSubscribe = function() {
    this.knapsack.on(EKnapsackEvent.ItemExpired, (item) => {
        if(this._config.avoidBadBots) {
            this._badOffers.markAsBad(item);
        }
    });
};

MarketManager.prototype.__getDataPath = function(subPath) {
    return path.resolve(this._config.dataDir, subPath);
};

require("./ManagerBalanceUpdater");
require("./ManagerApiLogger");
