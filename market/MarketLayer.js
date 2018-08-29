"use strict";

const path = require("path");

const PRICE_ALLOWED_FLUCTUATION = 0;
const PRICE_COMPROMISE = 0;
const MIN_COMPROMISE = 30 * 100;

const STEAM_TRADE_TTL = 70 * 1000;

const EventEmitter = require("events").EventEmitter;

const EMarketMessage = require("./enums/EMarketMessage");
const EMarketItemStatus = require("./enums/EMarketItemStatus");
const EMarketEventStage = require("./enums/EMarketEventStage");
const EMarketEventType = require("./enums/EMarketEventType");

const MarketKnapsack = require("./MarketKnapsack");
const MarketSockets = require("./MarketSockets");
const CSGOtm = require("../../modules/CsgoTmApi");

const logger = global.logger;
const shuffle = global.shuffle;

/** @type {MarketLayer} */
let self;

/** @type {CSGOtmAPI} */
let api;
/** @type {ItemsCache} */
let _cache;

module.exports = MarketLayer;

require("util").inherits(MarketLayer, EventEmitter);

/**
 * Layer to work with http://market.csgo.com
 *
 * @param {Object} options Information about bot
 * @param {CBot} options.bot
 * @param {ItemsCache} options.cache
 * @param {Number} [options.pingInterval]
 * @param {Number} [options.wsPingInterval]
 * @param {Number} [options.balanceUpdateInterval]
 * @param {HttpsProxyAgent} [options.proxy]
 * @constructor
 * @extends EventEmitter
 */
function MarketLayer(options) {
    self = this;
    _cache = options.cache;

    if(options.proxy) {
        logger.log(`Proxy requests to market via: ${options.proxy.proxy.host}:${options.proxy.proxy.port}`);
    }

    this.isStarted = false;

    this.bot = options.bot;

    this.pingInterval = options.pingInterval || (3 * 60 * 1000 + 5 * 1000); // We need to ping TM every 3 minutes; 5 seconds margin cause TM is silly
    this.balanceUpdateInterval = options.balanceUpdateInterval || 1.5 * 60 * 1000; // We use websockets, so we don't have to check balance too frequently

    this.api = api = new CSGOtm({
        defaultGotOptions: {
            agent: options.proxy,
        },
        apiKey: options.bot.tmKey,
        htmlAnswerLogPath: path.normalize(global.DATA_DIR + "/../tm_errors"),
    });

    this.knapsack = new MarketKnapsack({
        market: self,
    });
    setKnapsackEvents(this.knapsack);

    this.ws = new MarketSockets({
        proxy: options.proxy,
        layer: self,
    });
    setWsEvents(this.ws);

    /**
     * Requests log of items take. We need it to avoid multiple requests of the same bot
     * @type {{Number: {String: Number}}}
     */
    this.takeRequests = {};
}

MarketLayer.prototype.start = function() {
    if(self.isStarted) {
        return;
    }
    self.isStarted = true;

    setWatcher(() => {
        self.ping().catch((e) => {
            logger.error("Major error on market ping-pong", e);
        });
    }, self.pingInterval);
    setWatcher(self.requestBalanceUpdate, self.balanceUpdateInterval);

    self.knapsack.start();
    self.ws.start();

    self._takeNextItems();
};

MarketLayer.prototype.buyItem = function(mhn, maxPrice, botWallet, partnerId, tradeToken) {
    return self._getVariantsToBuy(mhn, maxPrice).then((list) => {
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
                        console.log("buy res", response, response === EMarketItemStatus.BotIsBanned, response === EMarketItemStatus.SteamProblems);

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
    let allowedPrice = self._computeMaxPrice(maxPrice);

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

MarketLayer.prototype._computeMaxPrice = function(meanPrice) {
    let allowedPrice = meanPrice * (1 + PRICE_ALLOWED_FLUCTUATION);
    let compromise = Math.max(meanPrice * PRICE_COMPROMISE, MIN_COMPROMISE);

    return allowedPrice + compromise;
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
            if(e.message === "bad_token_inv_closed") {
                sleepTime = 10000;
                self.emit("badPrivacySettings");
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

MarketLayer.prototype.requestBalanceUpdate = function() {
    /**
     * @property {Number} data.money
     */
    api.accountGetMoney().then((data) => {
        if(self.bot.tmWallet !== data.money) {
            logger.log("Current bot balance: " + data.money / 100);
        }

        self.emit("balance", data.money);
    }).catch((e) => logger.warn("Error occurred on requestBalanceUpdate: ", e));
};

MarketLayer.prototype._getWsAuth = function() {
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

        return self._getWsAuth();
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

MarketLayer.prototype._takeItemsFromBot = function(uiBid) {
    return api.sellCreateTradeRequest(uiBid, "out").then((answer) => {
        if(answer.success) {
            /*self.takeRequests[uiBid] = {
                bid: uiBid,
                time: Date.now(),
                tradeId: String(answer.trade),
            };*/

            return {
                trade_id: answer.trade,
                secret: answer.secret,
            };
        } else {
            throw answer;
        }
    });
};

/**
 * @param {Number} marketId
 * @param {Date} [operationDate]
 */
MarketLayer.prototype.checkItemState = function(marketId, operationDate) {
    let start, end;
    if(operationDate) {
        let range = 15 * 60 * 1000;

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
                let err = new Error("Event for marketItem#" + marketId + " not found");
                err.type = "notFound";

                throw err;
            }

            let stage = Number(buyEvent.stage);
            let itemState = {};
            if(stage === EMarketEventStage.Ready) {
                itemState.text = "ready";
            } else if(stage === EMarketEventStage.Waiting) {
                itemState.text = "waiting";
            } else if(stage === EMarketEventStage.Unsuccessful) {
                itemState.text = "unsuccessful";
            }

            return itemState;
        } else {
            console.log("history", history);

            throw new Error("Failed to get history");
        }
    });
};

function setWsEvents(ws) {
    ws.on("balance", (newBalance) => {
        //console.log("balance", newBalance);

        self.emit("balance", newBalance);
    });
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
 * @param {MarketKnapsack} knapsack
 */
function setKnapsackEvents(knapsack) {
    knapsack.on("updated", () => {
        self.emit("knapsackUpdate", [knapsack.pendingItemsCount, knapsack.takeItemsCount]);
    });
}

function setWatcher(fn, interval) {
    if(isNaN(interval)) {
        throw new Error("Interval can not be NaN");
    }

    setInterval(() => fn.apply(self), interval);

    fn.apply(self);
}

function getRandomElement(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}
