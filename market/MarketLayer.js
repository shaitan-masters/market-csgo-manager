"use strict";

const EMarketMessage = require("./enums/system/EMarketMessage");
const EMarketEventStage = require("./enums/system/EMarketEventStage");
const EMarketEventType = require("./enums/system/EMarketEventType");

const EErrorType = require("./enums/EErrorType");
const EErrorSource = require("./enums/EErrorSource");
const MiddlewareError = require("./classes/MiddlewareError");

const CSGOtm = require("../modules/CsgoTmApi");
const FnExtensions = require("../modules/FnExtensions");

/** @interface {console} */
let logger;
/** @type {CSGOtmAPI} */
let api;

module.exports = MarketLayer;

/**
 * High lever layer to work with http://market.csgo.com
 *
 * @param {CMarketConfig} config
 * @param {console} [_logger]
 * @constructor
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
};

MarketLayer.prototype.buyItem = function(hashName, goodPrice, partnerId, tradeToken) {
    return this._getItemOffers(hashName, goodPrice).then((list) => {
        return this.buyCheapest(list, this.tradeData(partnerId, tradeToken));
    });
};

MarketLayer.prototype.buyCheapest = function(offers, tradeData) {
    let badItemPrice = false;

    function buyAttempt() {
        if(offers.length === 0) {
            throw MiddlewareError("All buy attempts failed", EErrorType.AttemptsFailed, EErrorSource.Market);
        }

        let balance = this._getAccountBalance();
        let instance = offers.shift();
        let needMoney = instance.price;

        if(balance !== false && needMoney > balance) {
            throw MiddlewareError("Need to top up bots balance", EErrorType.NeedMoney, EErrorSource.Owner, {needMoney});
        }

        return api.buyCreate(instance, instance.price, tradeData).then((response) => {
            switch(response.result) {
                case EMarketMessage.Ok:
                    return {
                        uiId: response.id,
                        classId: instance.classId,
                        instanceId: instance.instanceId,
                        price: instance.price,
                    };

                case EMarketMessage.BadOfferPrice:
                    // Замечено, что ошибка вознимает, когда маркет считет цену покупки слишком высокой (по сравнению со стимом, наверное)
                    // Пример 95% этой ошибки: пытаемся купить за 30-50р предмет, который в стиме стоит 3-6р
                    // В таком случае не имеет смысла постоянно пытаться покупать предмет по все большей цене
                    if(badItemPrice) {
                        throw MiddlewareError("Unable to buy item for current price", EErrorType.BadOfferPrice, EErrorSource.Market);
                    }
                    badItemPrice = true;

                    logger.trace(`${response.result}; mhn: ${instance.hashName}; netid: ${instance.classId}_${instance.instanceId}; buy price: ${instance.price}`);
                case EMarketMessage.BuyOfferExpired:
                case EMarketMessage.SomebodyBuying:
                case EMarketMessage.RequestErrorNoList:
                case EMarketMessage.SteamOrBotProblems:
                case EMarketMessage.BotIsBanned:
                    return buyAttempt();

                case EMarketMessage.NeedToTake:
                    throw MiddlewareError("Need to withdraw items", EErrorType.NeedToTake, EErrorSource.Owner);
                case EMarketMessage.NeedMoney:
                    throw MiddlewareError("Need to top up bots balance", EErrorType.NeedMoney, EErrorSource.Owner, {needMoney});

                case EMarketMessage.InvalidTradeLink:
                    throw MiddlewareError("Your trade link is invalid", EErrorType.InvalidToken, EErrorSource.User);
                case EMarketMessage.SteamInventoryPrivate:
                    throw MiddlewareError("Your Steam inventory is closed", EErrorType.InventoryClosed, EErrorSource.User);
                case EMarketMessage.OfflineTradeProblem:
                    throw MiddlewareError("Trade link failed, check your ability to trade", EErrorType.UnableOfflineTrade, EErrorSource.User);

                default:
                    logger.debug("Unknown buy res", response);

                    return buyAttempt();
            }
        });
    }

    return buyAttempt();
};

MarketLayer.prototype.tradeData = function(partnerId, tradeToken) {
    if(partnerId && tradeToken) {
        return {
            partnerId: partnerId,
            tradeToken: tradeToken
        };
    }

    return null;
};

/**
 * Returns asset variants to buy the item, sorted by their price
 * @param {String} mhn - Item hash name
 * @param {Number?} [maxPrice] - Max item price that we can accept
 * @return {Promise<Array<{instanceId: String, classId: String, price: Number, offers: Number}>>}
 */
MarketLayer.prototype._getItemOffers = function(mhn, maxPrice) {
    let allowedPrice = maxPrice ? this._config.preparePrice(maxPrice) : Infinity;

    function extractOffers(items) {
        return items.map((item) => {
            let ids = CSGOtm.getItemIds(item);

            return {
                hashName: mhn,
                instanceId: ids.instanceId,
                classId: ids.classId,
                price: Number(item.price),
                offers: Number(item.offers),
            };
        });
    }

    function prepareOffers(items) {
        return items.filter((item) => {
            // remove all expensive and invalid offers
            return item.price <= allowedPrice && item.offers > 0;
        }).sort((a, b) => {
            // sort offers from cheapest to most expensive
            return a.price - b.price;
        });
    }

    return api.searchItemByName(mhn).then((itemVariants) => {
        if(!itemVariants.success) {
            throw MiddlewareError("Can't get item variants on TM", EErrorType.RequestFailed, EErrorSource.Market);
        }
        if(!itemVariants.list || itemVariants.list.length === 0) {
            throw MiddlewareError("Got empty list of item variants on TM", EErrorType.NotFound, EErrorSource.Market);
        }

        let rawVariants = extractOffers(itemVariants.list);
        let sortedVariants = prepareOffers(rawVariants);

        if(sortedVariants.length === 0) {
            let message = "There are variants, but all of them are too expensive";
            let lowestPrice = Math.min.apply(null, rawVariants.map((item) => item.price));

            throw MiddlewareError(message, EErrorType.TooHighPrices, EErrorSource.Owner, {lowestPrice});
        }

        return sortedVariants;
    });
};

MarketLayer.prototype._setAccountBalance = function(botWallet) {
    this._wallet = Number(botWallet); // in cents
};

MarketLayer.prototype._getAccountBalance = function() {
    if(typeof this._wallet === "undefined") {
        return false;
    }

    return this._wallet;
};

MarketLayer.prototype.setTradeToken = function(newToken) {
    let attempts = 0;

    function tokenSetAttempt() {
        attempts++;

        return api.accountSetToken(newToken).then((data) => {
            if(!data.success) {
                throw new Error(data.error);
            }

            logger.log("Trade token updated on TM");
        }).catch((e) => {
            logger.warn("Error occurred on update token: ", e);
            if(attempts >= 3) {
                throw e;
            }

            let sleepTime = 1500;
            if(e.message === EMarketMessage.BadTokenInvClosed) {
                sleepTime = 10000;
            }

            return new Promise((res, rej) => {
                setTimeout(() => {
                    res(tokenSetAttempt());
                }, sleepTime);
            });
        });
    }

    return api.accountGetToken().then((data) => {
        if(data.success && data.token !== newToken) {
            return tokenSetAttempt();
        }
    });
};

MarketLayer.prototype.getTrades = function() {
    return api.accountGetTrades().then((trades) => {
        return trades.map((item) => {
            let ids = CSGOtm.getItemIds(item);

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

MarketLayer.prototype.getSteamTradeId = function(uiBid) {
    return this.takeItemsFromBot(uiBid).then((botTrade) => botTrade.trade_id);
};

MarketLayer.prototype.getBalance = function() {
    return api.accountGetMoney().then((data) => {
        /**
         * @property {Number} data.money
         */

        return Number(data.money);
    }).catch((e) => logger.warn("Error occurred on getBalance: ", e));
};

MarketLayer.prototype.getWsAuth = function() {
    return api.accountGetWSAuth().then((auth) => {
        /**
         * @property {Boolean} auth.success
         * @property {String} auth.wsAuth
         */

        if(!auth.success) {
            throw auth;
        }

        return auth.wsAuth;
    }).catch((err) => {
        logger.error(err);

        // retry
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

            return null;
        } else {
            logger.warn("Error occurred on pingPong request", e.message);

            throw e;
        }
    });
};

MarketLayer.prototype.takeItemsFromBot = function(uiBid) {
    return api.sellCreateTradeRequest(uiBid, CSGOtm.CREATE_TRADE_REQUEST_TYPE.OUT).then((answer) => {
        if(!answer.success) {
            throw answer;
        }

        // todo: remove this comment
        /* self.takeRequests[uiBid] = {
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
    });
};

/**
 * @param {Number} marketId - market item id
 * @param {Date} [operationDate] - date, when this item was bought
 */
MarketLayer.prototype.getItemState = function(marketId, operationDate) {
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
