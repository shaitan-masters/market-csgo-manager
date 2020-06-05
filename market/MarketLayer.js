"use strict";

const EMarketMessage = require("./enums/system/EMarketMessage");
const EMarketEventStage = require("./enums/system/EMarketEventStage");
const EMarketEventType = require("./enums/system/EMarketEventType");

const EErrorType = require("./enums/EErrorType");
const EErrorSource = require("./enums/EErrorSource");
const MiddlewareError = require("./classes/MiddlewareError");

const MarketApi = require("../modules/MarketApi");
const FnExtensions = require("../modules/FnExtensions");

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

    /** @interface {console} */
    this._log = _logger;

    this.started = false;
    this.pingEnabled = true;

    this.api = new MarketApi({
        gotOptions: {
            agent: config.proxy,
            retry: {
                retries: 3,
                statusCodes: [408, 413, 429, 500, 502, 503, 504, 520]
            }
        },
        apiKey: config.apiKey,
        htmlAnswerLogPath: config.errorLogPath,
    });

    this._wallet = null;
}

MarketLayer.prototype.start = function() {
    if(this.started) {
        return;
    }
    this.started = true;

    this._log.trace("Starting market layer");

    FnExtensions.setWatcher(() => {
        if(this.pingEnabled) {
            this.ping().catch((e) => this._log.error("Major error on market ping-pong", e));
        }
    }, this._config.pingInterval);
};

MarketLayer.prototype.buyItem = function(hashName, goodPrice, partnerId, tradeToken) {
    return this.getItemOffers(hashName, goodPrice).then((list) => {
        return this.buyCheapest(list, this.tradeData(partnerId, tradeToken));
    });
};

MarketLayer.prototype.buyCheapest = function(offers, tradeData) {
    let badItemPrice = false;

    let buyAttempt = () => {
        if(offers.length === 0) {
            throw MiddlewareError("All buy attempts failed", EErrorType.AttemptsFailed, EErrorSource.Market);
        }

        let balance = this._getAccountBalance();
        let instance = offers.shift();

        if(balance !== false && instance.price > balance) {
            throw MiddlewareError("Need to top up bots balance", EErrorType.NeedMoney, EErrorSource.Owner, {needMoney: instance.price});
        }

        return this._tryToBuy(instance, tradeData).then((data) => {
            if(data === null) {
                return buyAttempt();
            }

            return data;
        }).catch((err) => {
            // Замечено, что ошибка вознимает, когда маркет считет цену покупки слишком высокой (по сравнению со стимом, наверное)
            // Пример 95% этой ошибки: пытаемся купить за 30-50р предмет, который в стиме стоит 3-6р
            // В таком случае не имеет смысла постоянно пытаться покупать предмет по все большей цене
            if(err instanceof MiddlewareError && err.type === EErrorType.BadOfferPrice && !badItemPrice) {
                badItemPrice = true;

                return buyAttempt();
            }
            if(err.statusCode) {
                err.instance = instance;
            }

            throw err;
        });
    };

    return buyAttempt();
};

MarketLayer.prototype._tryToBuy = function(instance, tradeData) {
    let gotOptions = {
        retry: {
            retries: 1,
        },
    };
    let iprice = instance.price;

    return this.api.buyCreate(instance, iprice, tradeData, gotOptions).then((response) => {
        let message = response.result;

        switch(message) {
            case EMarketMessage.Ok:
                return {
                    uiId: response.id,
                    classId: instance.classId,
                    instanceId: instance.instanceId,
                    price: iprice,
                };

            case EMarketMessage.BadOfferPrice:
                this._log.trace(`${response.result}; mhn: ${instance.hashName}; netid: ${instance.classId}_${instance.instanceId}; buy price: ${iprice}`);
                throw MiddlewareError("Unable to buy item for current price", EErrorType.BadOfferPrice, EErrorSource.Market);

            case EMarketMessage.BuyOfferExpired:
            case EMarketMessage.SomebodyBuying:
            case EMarketMessage.RequestErrorNoList:
            case EMarketMessage.SteamOrBotProblems:
            case EMarketMessage.BotIsBanned:
            case EMarketMessage.ServerError7:
                this._log.trace(EMarketMessage.hash(message));
                return null;

            case EMarketMessage.NeedToTake:
                throw MiddlewareError("Need to withdraw items", EErrorType.NeedToTake, EErrorSource.Owner);
            case EMarketMessage.NeedMoney:
                throw MiddlewareError("Need to top up bots balance", EErrorType.NeedMoney, EErrorSource.Owner, {needMoney: iprice});

            case EMarketMessage.InvalidTradeLink:
                throw MiddlewareError("Your trade link is invalid", EErrorType.InvalidToken, EErrorSource.User);
            case EMarketMessage.SteamInventoryPrivate:
                throw MiddlewareError("Your Steam inventory is closed", EErrorType.InventoryClosed, EErrorSource.User);
            case EMarketMessage.OfflineTradeProblem:
                throw MiddlewareError("Trade link failed, check your ability to trade", EErrorType.UnableOfflineTrade, EErrorSource.User);
            case EMarketMessage.VacGameBan:
                throw MiddlewareError("You have VAC or game ban", EErrorType.VacGameBan, EErrorSource.User);

            default:
                this._log.debug("Unknown buy res", response);

                return null;
        }
    });
};

MarketLayer.prototype.tradeData = function(partnerId, tradeToken) {
    if(partnerId && tradeToken) {
        return {
            partnerId: partnerId,
            tradeToken: tradeToken,
        };
    }

    return null;
};

/**
 * Returns asset variants to buy the item, sorted by their price
 * @param {String} mhn - Item hash name
 * @param {Number?} [maxPrice] - Max item price that we can accept
 * @return {Array<{instanceId: String, classId: String, price: Number, offers: Number}>}
 * @async
 */
MarketLayer.prototype.getItemOffers = async function(mhn, maxPrice) {
    let allowedPrice = maxPrice ? this._config.preparePrice(maxPrice) : Number.MAX_VALUE;

    function extractOffers(items) {
        return items.map((item) => {
            let ids = MarketApi.getItemIds(item);

            return {
                hashName: MarketApi.getItemHash(item),
                instanceId: ids.instanceId,
                classId: ids.classId,
                price: Number(item.price),
                offers: Number(item.offers),
            };
        });
    }

    function prepareOffers(items) {
        return items
            .filter((item) => item.price <= allowedPrice && item.offers > 0) // remove all expensive and empty offers
            .filter((item) => item.hashName === mhn) // remove all offers with the wrong items (yes, that happens)
            .sort((a, b) => a.price - b.price); // sort offers from cheapest to most expensive
    }

    let itemVariants = await this.api.searchItemByName(mhn);
    if(!itemVariants.success) {
        throw MiddlewareError("Can't get item variants on TM", EErrorType.RequestFailed, EErrorSource.Market);
    }
    if(!itemVariants.list || itemVariants.list.length === 0) {
        throw MiddlewareError("Got empty list of item variants on TM", EErrorType.NotFound, EErrorSource.Market);
    }

    let rawVariants = extractOffers(itemVariants.list);
    let preparedVariants = prepareOffers(rawVariants);

    if(preparedVariants.length === 0) {
        let message = "There are variants, but all of them are too expensive or invalid";
        let lowestPrice = Math.min.apply(null, rawVariants.map((item) => item.price));

        throw MiddlewareError(message, EErrorType.TooHighPrices, EErrorSource.Owner, {lowestPrice});
    }

    return preparedVariants;
};

/**
 * @param {Number} botWallet
 */
MarketLayer.prototype.setAccountBalance = function(botWallet) {
    this._wallet = Number(botWallet); // in cents
};

MarketLayer.prototype._getAccountBalance = function() {
    if(this._wallet === null) {
        return Number.MAX_VALUE;
    }

    return this._wallet;
};

MarketLayer.prototype.setTradeToken = function(newToken) {
    return this.api.accountGetToken().then((data) => {
        if(data.success && data.token !== newToken) {
            return this.api.accountSetToken(newToken, {retry: {retries: 5}}).then(() => {
                if(!data.success) {
                    throw new Error(data.error);
                }

                this._log.log("Trade token updated on TM");
            });
        }
    });
};

MarketLayer.prototype.getTrades = function() {
    return this.api.accountGetTrades().then((trades) => {
        return trades.map((item) => {
            let ids = MarketApi.getItemIds(item);

            return {
                ui_id: Number(item.ui_id),
                ui_status: Number(item.ui_status),
                ui_price: Math.round(Number(item.ui_price) * 100),
                ui_bid: Number(item.ui_bid),
                classId: ids.classId,
                instanceId: ids.instanceId,
                market_hash_name: MarketApi.getItemHash(item),
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
    return this.api.accountGetMoney().then((data) => {
        /** @property {Number} [data.money] */
        if(!data || typeof data.money === 'undefined') {
            throw new Error('Failed to extract balance from response');
        }

        return Number(data.money);
    }).catch((e) => this._log.warn("Error occurred on getBalance: ", e));
};

MarketLayer.prototype.getWsAuth = function() {
    return this.api.accountGetWSAuth().then((auth) => {
        /**
         * @property {Boolean} auth.success
         * @property {String} auth.wsAuth
         */

        if(!auth.success) {
            throw auth;
        }

        return auth.wsAuth;
    }).catch((err) => {
        this._log.error(err);

        // retry
        return this.getWsAuth();
    });
};

MarketLayer.prototype.ping = function() {
    /**
     * @property {Boolean} data.success
     * @property {String} data.ping
     */
    return this.api.accountPingPong().then((data) => {
        if(data.success) {
            this._log.log("TM successfully answered: " + data.ping);

            return data.ping;
        } else {
            if(data.ping !== EMarketMessage.TooEarlyToPong) {
                this._log.warn("Failed to ping TM: " + data.ping);

                throw data.ping;
            }
        }
    }).catch((e) => {
        if(e.message !== EMarketMessage.CheckTokenOrMobile) {
            this._log.warn("Error occurred on pingPong request", e);

            return null;
        } else {
            this._log.warn("Error occurred on pingPong request", e.message);

            throw e;
        }
    });
};

MarketLayer.prototype.takeItemsFromBot = function(uiBid) {
    return this.api.sellCreateTradeRequest(uiBid, MarketApi.CREATE_TRADE_REQUEST_TYPE.OUT).then((answer) => {
        if(!answer.success) {
            throw answer;
        }

        return {
            trade_id: answer.trade, // steam trade id
            bot_id: answer.botid, // bot steam id
            secret: answer.secret, // secret code in trade message
            time: Date.now(),
        };
    });
};

/**
 * @param {Date} [operationDate] - date, when this items was bought
 * @param {Number} [timeMargin] - in milliseconds
 */
MarketLayer.prototype.getBoughtItems = function(operationDate, timeMargin = 60 * 1000) {
    // We have to align date if it is not passed in UTC+0
    if(this._config.handleTimezone) {
        let REQUIRED_TIMEZONE = 0; // UTC0
        let currentTimezone = operationDate.getTimezoneOffset();

        let offset = -(REQUIRED_TIMEZONE - currentTimezone);

        operationDate = new Date(operationDate.getTime() + offset * 60 * 1000);
    }

    let start, end;
    if(operationDate) {
        start = new Date();
        start.setTime(operationDate.getTime() - timeMargin);

        end = new Date();
        end.setTime(operationDate.getTime() + timeMargin);
    } else {
        start = new Date(0);
        end = new Date();
    }

    return this.api.accountGetOperationHistory(start, end).then((history) => {
        if(history.success) {
            let buyEvents = history.history.filter((event) => {
                return event.h_event === EMarketEventType.BuyGo;
            });
            if(!buyEvents.length) {
                throw MiddlewareError("Buy events on " + operationDate + " not found", EErrorType.NotFound);
            }

            return buyEvents;
        } else {
            this._log.debug("Failed to fetch operation history", history, operationDate);

            throw MiddlewareError("Failed to get history", EErrorType.HistoryFailed);
        }
    });
};

/**
 * @param {Number} marketId - market item id
 * @param {Date} [operationDate] - date, when this item was bought
 */
MarketLayer.prototype.getItemState = async function(marketId, operationDate) {
    let initialMargin = 45 * 1000;
    let extendedMargin = 5 * 60 * 1000;
    let extractItem = (history) => history.find((event) => Number(event.item) === marketId);

    let getItem = async(margin) => {
        let history = await this.getBoughtItems(operationDate, margin);
        let buyEvent = extractItem(history);
        if(!buyEvent) {
            throw MiddlewareError("Event for marketItem#" + marketId + " not found", EErrorType.NotFound);
        }

        return buyEvent;
    };
    let makeRequests = async() => {
        try {
            return await getItem(initialMargin);
        } catch(e) {
            if(e.type === EErrorType.NotFound) {
                return await getItem(extendedMargin);
            } else {
                throw e;
            }
        }
    };

    let buyEvent;
    try {
        buyEvent = await makeRequests();
    } catch(e) {
        e.marketId = marketId;
        throw e;
    }

    let stage = Number(buyEvent.stage);
    if(!EMarketEventStage.has(stage)) {
        throw MiddlewareError("Unknown item operation stage", EErrorType.UnknownStage);
    }

    return stage;
};
