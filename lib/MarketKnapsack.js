"use strict";

const STEAM_TRADE_TTL = 70 * 1000;

const EventEmitter = require("events").EventEmitter;

const EMarketItemStatus = require("../market/enums/system/EMarketItemStatus");
const CKnapsackItem = require("./classes/CKnapsackItem");
const FnExtensions = require("../modules/FnExtensions");

/** @interface {console} */
let logger;

module.exports = MarketKnapsack;
require("util").inherits(MarketKnapsack, EventEmitter);

/**
 * Manages: items list, their precise state/events, trades info/creation
 *
 * @param {CKnapsackConfig} config
 * @param {MarketLayer} layer
 * @param {MarketSockets} sockets
 * @param {console} [_logger]
 * @constructor
 * @extends {EventEmitter}
 */
function MarketKnapsack(config, layer, sockets, _logger = console) {
    this._config = config;

    this._market = layer;
    this._sockets = sockets;

    /**
     * Indexed by item.ui_id
     * @type {{Number: CKnapsackItem}}
     */
    this.items = {};

    this.trades = {};

    /**
     * We bought them, but still can't take
     * @readonly
     */
    this.pendingCount = 0;
    /**
     * We are ready to take them or they are already sent
     * @readonly
     */
    this.sentCount = 0;

    this.started = false;



    /** @deprecated */
    /**
     * Requests log of items take. We need it to avoid multiple requests of the same bot
     * @type {{Number: {String: Number}}}
     */
    this.takeRequests = {};

    /** @readonly */
    this.pendingItemsCount = 0;
    /** @readonly */
    this.takeItemsCount = 0;
}

MarketKnapsack.prototype.start = function() {
    if(this.started) {
        return;
    }
    this.started = true;

    this.check().then(() => {
        setInterval(() => {
            let currentInterval = _market.ws.isConnected() ? self._checkIntervalWithWs : self._checkInterval;

            if(Date.now - self._lastCheck >= currentInterval) {
                self.check();
            }
        }, self._checkInterval);
    });

    this._takeNextItems();
};

MarketKnapsack.prototype.processItem = function(item) {
    let updated = false;

    if(!self.items[item.ui_id]) {
        self.items[item.ui_id] = item;

        updated = self._changeCounters(item, 1);
    } else {
        let cItem = self.items[item.ui_id];

        if(cItem.ui_status !== item.ui_status) {
            self._changeCounters(cItem, -1);

            cItem.ui_status = item.ui_status;

            updated = self._changeCounters(cItem, 1);
        }
    }

    if(updated) {
        self.emit("updated");
    }
};

MarketKnapsack.prototype.remove = function(item) {
    let updated = false;

    if(self.items[item.ui_id]) {
        updated = self._changeCounters(self.items[item.ui_id], -1);

        delete self.items[item.ui_id];
    }

    if(updated) {
        self.emit("updated");
    }
};

MarketKnapsack.prototype._changeCounters = function(item, delta) {
    let updated = false;

    if(item.ui_status === EMarketItemStatus.Pending) {
        self.pendingItemsCount += delta;

        updated = true;
    } else if(item.ui_status === EMarketItemStatus.NeedToTake) {
        self.takeItemsCount += delta;

        updated = true;
    }

    return updated;
};

// get real tm list and compare it with ours. In ideal world there should not be any changes
MarketKnapsack.prototype.check = function() {
    return new Promise((res, rej) => {
        _market.getTrades().then((trades) => {
            let cPending = 0, cToTake = 0;
            let cItems = {};

            trades.forEach((item) => {
                if(item.ui_status === EMarketItemStatus.Pending) {
                    cPending++;
                } else if(item.ui_status === EMarketItemStatus.NeedToTake) {
                    cToTake++;
                }

                cItems[item.ui_id] = item;
            });

            let updated = self.pendingItemsCount !== cPending || self.takeItemsCount !== cToTake;

            self.pendingItemsCount = cPending;
            self.takeItemsCount = cToTake;
            self.items = cItems;

            self._lastCheck = Date.now();

            if(updated) {
                self.emit("updated");
            }

            res();
        }).catch((err) => {
            logger.error(err);
        });
    });
};

function setWsEvents(ws) {

    ws.on("connected", () => {
        /** noop */
    });
    ws.on("error", () => {
        /** noop */
    });

    ws.on("itemAdd", (data) => {
        //console.log("itemAdd", data);
        self.knapsack.add(data);
    });
    ws.on("itemTake", (data) => {
        //console.log("itemTake", data);
        self.knapsack.update(data);
    });
    ws.on("itemRemove", (data) => {
        //console.log("itemRemove", data);
        self.knapsack.remove(data);
    });
}

/**
 * @param {TradeOffer} trade
 */
MarketLayer.prototype.captureTradeEnd = function(trade) {
    for(let uiBid in self.takeRequests) {
        if(self.takeRequests[uiBid].tradeId === String(trade.id)) {
            // we delay this delete, because TM is slooooow
            setTimeout(() => {
                delete self.takeRequests[uiBid];
            }, 5 * 1000);
        }
    }
};

MarketLayer.prototype._clearTakeRequestsLog = function() {
    for(let uiBid in self.takeRequests) {
        if(Date.now() - self.takeRequests[uiBid].time > STEAM_TRADE_TTL) {
            delete self.takeRequests[uiBid];
        }
    }
};

/**
 * Returns bot data with max count of items to take and that don't already have take request
 * @return {Promise<*>}
 * @private
 */
MarketLayer.prototype._selectBotToTake = function() {
    return self.getTrades().then((trades) => {
        let botsItems = {};

        trades.forEach((trade) => {
            if(trade.ui_status === EMarketItemStatus.NeedToTake && !self.takeRequests[trade.ui_bid]) {
                if(!botsItems[trade.ui_bid]) {
                    botsItems[trade.ui_bid] = {
                        bid: trade.ui_bid,
                        list: [],
                    };
                }

                botsItems[trade.ui_bid].list.push(trade);
            }
        });
        // debug
        //console.log("botsItems", Object.keys(botsItems).length);

        let checkOrder = shuffle(Object.keys(botsItems));
        if(checkOrder.length === 0) {
            return false;
        }

        // Selecting bot with max items count
        let bestVariant = botsItems[checkOrder[0]];
        checkOrder.forEach((uiBid) => {
            if(botsItems[uiBid].list.length > bestVariant.list.length) {
                bestVariant = botsItems[uiBid];
            }
        });

        return bestVariant;
    });
};

MarketLayer.prototype._takeNextItems = function() {
    let sleepTime = 5 * 1000;

    if(self.knapsack.takeItemsCount === 0) {
        //logger.log("No items to take, judging by knapsack");

        setTimeout(self._takeNextItems, sleepTime);
        return;
    }

    self._clearTakeRequestsLog();
    // prohibits multiple simultaneous withdrawals
    /*if(Object.keys(self.takeRequests).length) {
        //logger.log("We are already taking some items. Please, wait");

        setTimeout(self._takeNextItems, sleepTime);
        return;
    }*/

    // self._selectBotToTake().then((botData) => {
    //     if(botData === false) {
    //         //logger.log("No items to request. Sleep for a while..");
    //         sleepTime = 10 * 1000;
    //
    //         setTimeout(self._takeNextItems, sleepTime);
    //         return;
    //     }
    //
    //     logger.log("Requesting " + botData.list.length + " item(s) from uiBot#" + botData.bid);
    //     self._takeItemsFromBot(botData.bid).then((tradeData) => {
    //         logger.log("Item(s) requested with trade#" + tradeData.trade_id + " and secret: '" + tradeData.secret + "'");
    //
    //         let itemsData = botData.list.map((item) => {
    //             let ids = CSGOtm.getItemIds(item);
    //
    //             return {
    //                 market_id: item.ui_id,
    //                 trade_id: tradeData.trade_id,
    //                 price: item.ui_price,
    //                 class_id: ids.classId,
    //                 instance_id: ids.instanceId,
    //             };
    //         });
    //
    //         self.emit("itemsUpdate", itemsData);
    //
    //         // by the way TM don't like to send items from multiple bots simultaneously, but we don't care
    //         setTimeout(self._takeNextItems, sleepTime);
    //     }).catch((err) => {
    //         if(err.message === EMarketMessage.RequestErrorNoList) {
    //             logger.warn("Request creation failed (no list). Try again later");
    //         } else {
    //             logger.error(err);
    //         }
    //
    //         setTimeout(self._takeNextItems, sleepTime);
    //     });
    // }).catch((err) => {
    //     logger.error(err);
    //
    //     self._takeNextItems();
    // });
};
