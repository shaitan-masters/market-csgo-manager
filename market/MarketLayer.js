"use strict";

const STEAM_TRADE_TTL = 70 * 1000;

const EventEmitter = require("events").EventEmitter;

const EMarketMessage = require("./enums/system/EMarketMessage");
const EMarketItemStatus = require("./enums/system/EMarketItemStatus");
const EMarketEventStage = require("./enums/system/EMarketEventStage");
const EMarketEventType = require("./enums/system/EMarketEventType");

const MiddlewareError = require("./classes/MiddlewareError");
const EErrorType = require("./enums/EErrorType");

const CSGOtm = require("../modules/CsgoTmApi");
const FnExtensions = require("../modules/FnExtensions");

/** @interface {console} */
let logger;
/** @type {CSGOtmAPI} */
let api;

module.exports = MarketLayer;
require("util").inherits(MarketLayer, EventEmitter);

/**
 * Layer to work with http://market.csgo.com
 *
 * @param {CMarketConfig} config
 * @param {console} [_logger]
 * @constructor
 * @extends EventEmitter
 */
function MarketLayer(config, _logger = console) {
    this._config = config;

    this.api = api = new CSGOtm({
        defaultGotOptions: {
            agent: config.proxy,
        },
        apiKey: config.apiKey,
        htmlAnswerLogPath: config.errorLogPath,
    });

    /**
     * Requests log of items take. We need it to avoid multiple requests of the same bot
     * @type {{Number: {String: Number}}}
     */
    this.takeRequests = {};

    this.started = false;

    logger = _logger;
}

MarketLayer.prototype.start = function() {
    if(this.started) {
        return;
    }
    this.started = true;

    FnExtensions.setWatcher(() => {
        this.ping().catch((e) => {
            logger.error("Major error on market ping-pong", e);
        });
    }, this._config.pingInterval);

    this._takeNextItems();
};

MarketLayer.prototype.buyItem = function(mhn, maxPrice, botWallet, partnerId, tradeToken) {
    return this._getVariantsToBuy(mhn, maxPrice).then((list) => {
        let badItemPrice = false;

        function buyAttempt() {
            if(list.length === 0) {
                let err = new Error("All buy attempts failed");
                err.type = "failedAttempts";

                throw err;
            }

            let instance = list.shift();
            if(instance.price > botWallet) {
                let err = new Error("Need to top up bots balance");
                err.type = "needMoney";
                err.needMoney = instance.price;

                throw err;
            }

            let err;
            return api.buyCreate(instance, instance.price, {partnerId: partnerId, tradeToken: tradeToken}).then((response) => {
                switch(response.result) {
                    case EMarketMessage.Ok:
                        return {
                            uiId: response.id,
                            classId: instance.classId,
                            instanceId: instance.instanceId,
                            price: instance.price,
                        };
                    case EMarketMessage.NeedToTake:
                        err = new Error("Need to withdraw items");
                        err.type = "needToTake";

                        throw err;
                    case EMarketMessage.BuyOfferExpired:
                    case EMarketMessage.SomebodyBuying:
                    case EMarketMessage.RequestErrorNoList:
                    case EMarketMessage.SteamProblems:
                    case EMarketMessage.BotIsBanned:
                        return buyAttempt();
                    case EMarketMessage.BadOfferPrice:
                        if(badItemPrice) {
                            err = new Error("Unable to buy item for current price");
                            err.type = "badItemPrice";

                            throw err;
                        } else {
                            logger.trace(`${response.result}; mhn: ${mhn}; netid: ${instance.classId}_${instance.instanceId}; buy price: ${instance.price}; max price: ${maxPrice}`);

                            badItemPrice = true;

                            return buyAttempt();
                        }
                    case EMarketMessage.NeedMoney:
                        err = new Error("Need to top up bots balance");
                        err.type = "needMoney";
                        err.needMoney = instance.price;

                        throw err;
                    case EMarketMessage.InvalidTradeLink:
                        err = new Error("Your trade link is invalid");
                        err.type = "invalidLink";

                        throw err;
                    case EMarketMessage.SteamInventoryPrivate:
                        err = new Error("Your Steam inventory is closed");
                        err.type = "inventoryClosed";

                        throw err;
                    case EMarketMessage.OfflineTradeProblem:
                        err = new Error("Trade link failed, check your ability to trade");
                        err.type = "unableOfflineTrade";

                        throw err;
                    default:
                        logger.debug("Unknown buy res", response);

                        return buyAttempt();
                }
            });
        }

        return buyAttempt();
    });
};

/**
 * Returns asset variants to buy the item, sorted by their price
 * @param {String} mhn - Item hash name
 * @param {Number} [maxPrice] - Max item price that we can accept
 * @return {Promise<Array<{instanceId: String, classId: String, price: Number, offers: Number}>>}
 */
MarketLayer.prototype._getVariantsToBuy = function(mhn, maxPrice) {
    let allowedPrice = this._config.preparePrice(maxPrice);

    //console.log("allowedPrice", allowedPrice, "compromise", compromise, "max", (allowedPrice + compromise));
    function prepareItems(items) {
        return items.map((item) => {
            let ids = CSGOtm.getItemIds(item);

            return {
                instanceId: ids.instanceId,
                classId: ids.classId,
                price: Number(item.price),
                offers: Number(item.offers),
            };
        }).filter((item) => {
            return (!maxPrice || item.price <= allowedPrice) && item.offers > 0;
        }).sort((a, b) => {
            return a.price - b.price;
        });
    }

    return api.searchItemByName(mhn).then((itemVariants) => {
        if(itemVariants.success) {
            if(itemVariants.list && itemVariants.list.length > 0) {
                let sortedVariants = prepareItems(itemVariants.list);

                if(sortedVariants.length === 0) {
                    let err = new Error("There are variants, but all of them are too expensive");
                    err.type = "tooHighPrices";
                    err.lowestPrice = Math.min.apply(null, itemVariants.list.map((el) => el.price));

                    throw err;
                }

                return sortedVariants;
            } else {
                let err = new Error("Got empty list of item variants on TM");
                err.type = "noListings";
                err.suggestedPrice = maxPrice;

                throw err;
            }
        } else {
            let err = new Error("Can't get item variants on TM");
            err.type = "failedRequest";

            throw err;
        }
    });
};

MarketLayer.prototype.setTradeToken = function(newToken) {
    let attempts = 0;

    function tmSet() {
        attempts++;

        api.accountSetToken(newToken).then((data) => {
            if(data.success) {
                logger.log("Trade token updated on TM");
            } else {
                throw new Error(data.error);
            }
        }).catch((e) => {
            logger.warn("Error occurred on update token: ", e);

            let sleepTime = 1500;
            if(e.message === EMarketMessage.BadTokenInvClosed) {
                sleepTime = 10000;

                this.emit("badPrivacySettings");
            }

            if(attempts < 3) {
                setTimeout(tmSet, sleepTime);
            }
        });
    }

    api.accountGetToken().then((data) => {
        if(data.success && data.token !== newToken) {
            tmSet();
        }
    }).catch((err) => logger.error(err));
};

MarketLayer.prototype.getTrades = function() {
    return api.accountGetTrades().then((trades) => {
        return trades.map((item) => {
            let ids = CSGOtm.getItemIds(item);
            // if(ids.instanceId === "0") {
            //     console.log("instanceId", item);
            // }

            return {
                ui_id: Number(item.ui_id),
                ui_status: Number(item.ui_status),
                ui_price: Math.round(Number(item.ui_price) * 100),
                ui_bid: Number(item.ui_bid),
                classId: ids.classId,
                instanceId: ids.instanceId,
                market_hash_name: CSGOtm.getItemHash(item),
                left: Number(item.left),
            };
        });
    });
};

MarketLayer.prototype.getTrade = function(uiId) {
    return this.getTrades().then((trades) => {
        return trades.find((trade) => trade.ui_id === Number(uiId));
    });
};

MarketLayer.prototype.getTradeId = function(uiBid) {
    return self._takeItemsFromBot(uiBid).then((botTrade) => botTrade.trade_id);
};

MarketLayer.prototype.getBalance = function() {
    /**
     * @property {Number} data.money
     */
    return api.accountGetMoney().then((data) => {
        return data.money;
    }).catch((e) => logger.warn("Error occurred on requestBalanceUpdate: ", e));
};

MarketLayer.prototype.getWsAuth = function() {
    /**
     * @property {Boolean} auth.success
     * @property {String} auth.wsAuth
     */
    return api.accountGetWSAuth().then((auth) => {
        if(auth.success) {
            return auth.wsAuth;
        } else {
            throw auth;
        }
    }).catch((err) => {
        logger.error(err);

        return this.getWsAuth();
    });
};

MarketLayer.prototype.ping = function() {
    /**
     * @property {Boolean} data.success
     * @property {String} data.ping
     */
    return api.accountPingPong().then((data) => {
        if(data.success) {
            logger.log("TM successfully answered: " + data.ping);

            return data.ping;
        } else {
            if(data.ping !== EMarketMessage.TooEarlyToPong) {
                logger.warn("Failed to ping TM: " + data.ping);

                throw data.ping;
            }
        }
    }).catch((e) => {
        if(e.message !== EMarketMessage.CheckTokenOrMobile) {
            logger.warn("Error occurred on pingPong request", e);
        } else {
            logger.warn("Error occurred on pingPong request", e.message);
        }

        if(e.message !== EMarketMessage.CheckTokenOrMobile) {
            throw e;
        }

        return null;
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

MarketLayer.prototype.takeItemsFromBot = function(uiBid) {
    return api.sellCreateTradeRequest(uiBid, CSGOtm.CREATE_TRADE_REQUEST_TYPE.OUT).then((answer) => {
        if(answer.success) {
            /*self.takeRequests[uiBid] = {
                bid: uiBid,
                time: Date.now(),
                tradeId: String(answer.trade),
            };*/

            return {
                trade_id: answer.trade, // steam trade id
                bot_id: answer.botid, // bot steam id
                secret: answer.secret, // secret code in trade message
                time: Date.now(),
            };
        } else {
            throw answer;
        }
    });
};

/**
 * @param {Number} marketId - market item id
 * @param {Date} [operationDate]
 */
MarketLayer.prototype.checkItemState = function(marketId, operationDate) {
    let start, end;
    if(operationDate) {
        let range = 10 * 60 * 1000;

        start = new Date();
        start.setTime(operationDate.getTime() - range);

        end = new Date();
        end.setTime(operationDate.getTime() + range);
    } else {
        start = new Date(0);
        end = new Date();
    }

    return api.accountGetOperationHistory(start, end).then((history) => {
        if(history.success) {
            let buyEvent = history.history.find((event) => {
                return event.h_event === EMarketEventType.BuyGo && Number(event.item) === marketId;
            });
            if(!buyEvent) {
                throw MiddlewareError("Event for marketItem#" + marketId + " not found", EErrorType.NotFound);
            }

            let stage = Number(buyEvent.stage);
            if(!EMarketEventStage.hasOwnProperty(stage)) {
                throw MiddlewareError("Unknown item operation stage", EErrorType.UnknownStage);
            }

            return stage;
        } else {
            logger.debug("Failed to fetch operation history", history, marketId, operationDate);

            throw MiddlewareError("Failed to get history", EErrorType.HistoryFailed);
        }
    });
};
