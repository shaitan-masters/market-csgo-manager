"use strict";

const EventEmitter = require("events").EventEmitter;

const EMarketItemStatus = require("../market/enums/system/EMarketItemStatus");
const EKnapsackItemStatus = require("./enums/EKnapsackItemStatus");
const ESocketEvent = require("../market/enums/ESocketEvent");

const CKnapsackItem = require("./classes/CKnapsackItem");
const CKnapsackTrade = require("./classes/CKnapsackTrade");

const ChangeableInterval = require("../modules/ChangeableInterval");
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
    logger = _logger;
    this._config = config;

    this.started = false;

    this._market = layer;
    this._sockets = sockets;

    /**
     * Indexed by item.ui_id
     * @type {Object.<Number, CKnapsackItem>}
     */
    this.items = {};
    /**
     * Indexed by Market bot id. We need it to avoid multiple requests of the same bot
     * @type {Object.<Number, CKnapsackTrade>}
     */
    this.trades = {};
}

MarketKnapsack.prototype.start = function() {
    if(this.started) {
        return;
    }
    this.started = true;

    this._setCheckInterval();
    this._setWsEvents();
};

MarketKnapsack.prototype._setCheckInterval = function() {
    this._checker = new ChangeableInterval(() => this.check(), this._config.updateInterval);
};

MarketKnapsack.prototype._setWsEvents = function() {
    this._sockets.on(ESocketEvent.Auth, () => {
        this._checker.change(this._config.validationInterval);
    });
    this._sockets.on(ESocketEvent.DeAuth, () => {
        this._checker.change(this._config.updateInterval);
    });

    this._sockets.on(ESocketEvent.ItemAdd, (data) => {
        //console.log("itemAdd", data);
        this.knapsack._add(data);
    });
    this._sockets.on(ESocketEvent.ItemTake, (data) => {
        //console.log("itemTake", data);
        this.knapsack._update(data);
    });
    this._sockets.on(ESocketEvent.ItemUpdate, (data) => {
        //console.log("temUpdate", data);
        this.knapsack._update(data);
    });
    this._sockets.on(ESocketEvent.ItemRemove, (data) => {
        //console.log("itemRemove", data);
        this.knapsack._remove(data);
    });
};

MarketKnapsack.prototype.itemsCount = function() {
    let data = {
        pending: 0, // We bought them, but still can't take
        sent: 0, // We are ready to take them or they are already sent
    };

    for(let id in this.items) {
        let item = this.items[id];

        switch(item.status) {
            case EKnapsackItemStatus.Pending:
                data.pending++;
                break;
            case EKnapsackItemStatus.Sent:
                data.sent++;
                break;
        }
    }

    return data;
};

MarketKnapsack.prototype._add = function(data) {
    // todo
};
MarketKnapsack.prototype._update = function(data) {
    // todo
};
MarketKnapsack.prototype._remove = function(data) {
    // todo
};

MarketKnapsack.prototype.check = function() {
    // todo
};

//
//
// Deprecated
//
//

MarketKnapsack.prototype.add = function(item) {
    self.processItem(item);
};

MarketKnapsack.prototype.update = function(item) {
    self.processItem(item);
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

// get real tm list and compare it with ours. In ideal world there should not be any changes
MarketKnapsack.prototype.__check = function() {
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

/** Below is legacy */

/**
 * @param {TradeOffer} trade
 */
// MarketKnapsack.prototype.captureTradeEnd = function(trade) {
//     for(let uiBid in self.takeRequests) {
//         if(self.takeRequests[uiBid].tradeId === String(trade.id)) {
//             // we delay this delete, because TM is slooooow
//             setTimeout(() => {
//                 delete self.takeRequests[uiBid];
//             }, 5 * 1000);
//         }
//     }
// };
//
// MarketKnapsack.prototype._clearTakeRequestsLog = function() {
//     for(let uiBid in self.takeRequests) {
//         if(Date.now() - self.takeRequests[uiBid].time > STEAM_TRADE_TTL) {
//             delete self.takeRequests[uiBid];
//         }
//     }
// };
//
// MarketKnapsack.prototype._storeNewTrade = function(tradeData, item) {
//     if(!this.trades[tradeData.bid]) {
//         this.trades[tradeData.bid] = new CKnapsackTrade(tradeData);
//     }
//
//     this.trades[tradeData.bid].addItem(item);
// };

/**
 * Returns bot data with max count of items to take and that don't already have take request
 * @return {Promise<*>}
 * @private
 */
// MarketKnapsack.prototype._selectBotToTake = function() {
//     return this._market.getTrades().then((trades) => {
//         let botsItems = {};
//
//         trades.forEach((trade) => {
//             if(trade.ui_status === EMarketItemStatus.NeedToTake && !this.trades[trade.ui_bid]) {
//                 if(!botsItems[trade.ui_bid]) {
//                     botsItems[trade.ui_bid] = {
//                         bid: trade.ui_bid,
//                         list: [],
//                     };
//                 }
//
//                 botsItems[trade.ui_bid].list.push(trade);
//             }
//         });
//         // debug
//         //console.log("botsItems", Object.keys(botsItems).length);
//
//         let checkOrder = shuffle(Object.keys(botsItems));
//         if(checkOrder.length === 0) {
//             return false;
//         }
//
//         // Selecting bot with max items count
//         let bestVariant = botsItems[checkOrder[0]];
//         checkOrder.forEach((uiBid) => {
//             if(botsItems[uiBid].list.length > bestVariant.list.length) {
//                 bestVariant = botsItems[uiBid];
//             }
//         });
//
//         return bestVariant;
//     });
// };

// MarketKnapsack.prototype._takeNextItems = function() {
//     let sleepTime = 5 * 1000;
//
//     if(self.knapsack.takeItemsCount === 0) {
//         //logger.log("No items to take, judging by knapsack");
//
//         setTimeout(self._takeNextItems, sleepTime);
//         return;
//     }
//
//     self._clearTakeRequestsLog();
//     // prohibits multiple simultaneous withdrawals
//     /*if(Object.keys(self.takeRequests).length) {
//         //logger.log("We are already taking some items. Please, wait");
//
//         setTimeout(self._takeNextItems, sleepTime);
//         return;
//     }*/
//
//     // self._selectBotToTake().then((botData) => {
//     //     if(botData === false) {
//     //         //logger.log("No items to request. Sleep for a while..");
//     //         sleepTime = 10 * 1000;
//     //
//     //         setTimeout(self._takeNextItems, sleepTime);
//     //         return;
//     //     }
//     //
//     //     logger.log("Requesting " + botData.list.length + " item(s) from uiBot#" + botData.bid);
//     //     self._takeItemsFromBot(botData.bid).then((tradeData) => {
//     //         logger.log("Item(s) requested with trade#" + tradeData.trade_id + " and secret: '" + tradeData.secret + "'");
//     //
//     //         let itemsData = botData.list.map((item) => {
//     //             let ids = CSGOtm.getItemIds(item);
//     //
//     //             return {
//     //                 market_id: item.ui_id,
//     //                 trade_id: tradeData.trade_id,
//     //                 price: item.ui_price,
//     //                 class_id: ids.classId,
//     //                 instance_id: ids.instanceId,
//     //             };
//     //         });
//     //
//     //         self.emit("itemsUpdate", itemsData);
//     //
//     //         // by the way TM don't like to send items from multiple bots simultaneously, but we don't care
//     //         setTimeout(self._takeNextItems, sleepTime);
//     //     }).catch((err) => {
//     //         if(err.message === EMarketMessage.RequestErrorNoList) {
//     //             logger.warn("Request creation failed (no list). Try again later");
//     //         } else {
//     //             logger.error(err);
//     //         }
//     //
//     //         setTimeout(self._takeNextItems, sleepTime);
//     //     });
//     // }).catch((err) => {
//     //     logger.error(err);
//     //
//     //     self._takeNextItems();
//     // });
// };
