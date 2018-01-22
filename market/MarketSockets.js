"use strict";

const DEFAULT_LEFT_TIME = -1;

const EventEmitter = require("events").EventEmitter;

const EMarketWsEvent = require("./enums/EMarketWsEvent");
const EMarketMessage = require("./enums/EMarketMessage");
const EMarketItemStatus = require("./enums/EMarketItemStatus");

const WebSocketClient = require_module("WebSocketClient");

const logger = global.logger;

/** @type {MarketSockets} */
let self;

/** @type {MarketLayer} */
let _layer;

let pingWatchdogClock;

module.exports = MarketSockets;

require("util").inherits(MarketSockets, EventEmitter);

/**
 * @param {MarketLayer} opts.layer
 * @param {HttpsProxyAgent} [opts.proxy]
 * @param {Number} [opts.pingInterval]
 * @constructor
 */
function MarketSockets(opts) {
    self = this;

    _layer = opts.layer;

    this.pingInterval = opts.pingInterval || 15 * 1000;
    this.proxy = opts.proxy || null;

    this.ws = self._createWebSockets();

    this._pingWatchdog = null;
    this._setPingWatchdog();

    this.authorized = false;
}

MarketSockets.prototype.start = function() {
    self.ws.open("wss://wsn.dota2.net/wsn/", {
        agent: self.proxy,
        _autoReconnectInterval: 2.5 * 1000,
        _pingInterval: self.pingInterval,
    });
};

/**
 * @return {Boolean} - Are we currently connectes to sockets
 */
MarketSockets.prototype.isConnected = function() {
    return self.ws.connected && self.authorized && !self.isStuck();
};

/**
 * @event MarketSockets#connected
 */
/**
 * @event MarketSockets#error
 * @type {Object} err
 */

/**
 * Creates new connection
 * @return {WebSocketClient}
 * @private
 */
MarketSockets.prototype._createWebSockets = function() {
    let wsClient = new WebSocketClient();

    wsClient.ping = function() {
        this.instance.send("ping");
    };

    wsClient.on("open", () => {
        logger.log("Connected to market web socket");

        self.emit("connected");

        self.auth();
    });
    wsClient.on("message", (msg) => {
        //console.log("ws msg: ", msg);

        self.handleMsg(msg);
    });
    wsClient.on("error", (err) => {
        logger.trace("market sockets error ", err);

        self.emit("error", err);
    });
    wsClient.on("close", () => {
        self.authorized = false;
    });

    return wsClient;
};

/**
 * @event MarketSockets#pong
 */
/**
 * @event MarketSockets#balance
 * @type {Number} - Balance in cents
 */
/**
 * @event MarketSockets#itemAdd
 * @type {Object}
 * @property {Number} ui_id
 * @property {Number} ui_status
 * @property {Number} ui_price
 */
/**
 * @event MarketSockets#itemTake
 * @type {Object}
 * @property {Number} ui_id
 * @property {Number} ui_status
 * @property {Number} ui_bid
 * @property {Number} left
 */
/**
 * @event MarketSockets#itemRemove
 * @type {Object}
 * @property {Number} ui_id
 * @property {Number} ui_status
 */

/**
 * Completely handles all messages from market sockets
 * @param {String} msg - Socket message
 */
MarketSockets.prototype.handleMsg = function(msg) {
    if(msg === EMarketWsEvent.Pong) {
        //logger.log("market ws pong");

        self.emit("pong");
        return;
    }
    if(msg === EMarketWsEvent.AuthFailed) {
        logger.error("Auth failed. Trying to authorize again");

        self.authorized = false;
        self.auth();
        return;
    }

    let json, data;
    try {
        json = JSON.parse(msg);
    } catch(e) {
        logger.warn("This message doesn't look like a valid JSON: " + msg);
        return;
    }

    try {
        data = JSON.parse(json.data);
    } catch(e) {
        logger.warn("This data doesn't look like a valid JSON: " + json.data);
        return;
    }

    self._handleMsgByType(json.type, data);
};

/**
 * @param {String} type
 * @param {Object|null} data
 * @private
 */
MarketSockets.prototype._handleMsgByType = function(type, data) {
    if(type === EMarketWsEvent.BalanceUpdate) {
        let parsed = self._extractFloatNumber(data);

        self.emit("balance", parsed);
    } else if(type === EMarketWsEvent.ItemAdd) {
        //console.log("ItemAdd", data);

        let prepared = {
            ui_id: Number(data.ui_id),
            ui_status: Number(data.ui_status),
            ui_price: Math.round(Number(data.ui_price) * 100),
        };
        self.emit("itemAdd", prepared);

        if(prepared.ui_status === EMarketItemStatus.Delivered) {
            let change = {
                ui_id: Number(data.ui_id),
                ui_status: Number(data.ui_status),
                ui_bid: Number(data.ui_bid),
                left: Number(data.left || DEFAULT_LEFT_TIME),
            };

            self.emit("itemTake", change);
        }
    } else if(type === EMarketWsEvent.ItemOut) {
        //console.log("ItemOut", data);

        // Currently we are not interested, because this event is
        // for items that we have to send, but we only buy items
    } else if(type === EMarketWsEvent.ItemStatusChange) {
        //console.log("ItemStatusChange", data);

        let prepared = {
            ui_id: Number(data.id),
            ui_status: Number(data.status),
        };

        if(prepared.ui_status === EMarketItemStatus.NeedToTake) {
            prepared.ui_bid = Number(data.bid);
            prepared.left = Number(data.left || DEFAULT_LEFT_TIME);

            self.emit("itemTake", prepared);
        } else if(prepared.ui_status === EMarketItemStatus.Delivered) {
            self.emit("itemRemove", prepared);
        }
    } else if(type === EMarketWsEvent.Notification) {
        data = JSON.parse(data);
        if(data.text && data.text === EMarketMessage.ItemReadyToTake) {
            // nothing to do right now
            // this event is not interesting for us, because we get ItemStatusChange that shows the same
        } else if(data.text && data.text === EMarketMessage.SupportAnswer) {
            /* noop */
        } else {
            logger.warn("Notification from market administration: ", data);
        }
    } else if(type === EMarketWsEvent.InventoryUpdate) {
        // We are not interested in this event
        // noop
    } else if(type === EMarketWsEvent.BetNotificationCs || type === EMarketWsEvent.BetNotificationGo) {
        // Tells us about bets promos. We are completely not interested in it

        // If you want to see it in logs uncomment the line below
        //console.log("BetNotification", type, JSON.parse(data));
    } else {
        logger.warn("Unsupported ws message type '" + type + "'", data);
    }
};

/**
 * Sends auth message to market sockets,
 * so we start to receive private events about our account
 */
MarketSockets.prototype.auth = function() {
    _layer._getWsAuth().then((authKey) => {
        self.authorized = true;

        self.ws.send(authKey);
        self.ws.ping();
    });
};

/**
 * Finds float number int text, multiplies in by 100 and rounds to avoid floating point problems
 * @param {String} rawBalance
 * @return {Number}
 * @private
 */
MarketSockets.prototype._extractFloatNumber = function(rawBalance) {
    return Math.round(parseFloat(rawBalance.replace(/[^\d\.]*/g, "")) * 100);
};

/**
 * Says if sockets is stuck and didn't communitace for too long
 * @return {boolean}
 */
MarketSockets.prototype.isStuck = function() {
    return pingWatchdogClock - Date.now() < 0;
};

/**
 * @private
 */
MarketSockets.prototype._updateWatchdogClock = function() {
    const offset = 50 * 60 * 1000;

    pingWatchdogClock = Date.now() + offset;
};

/**
 * @private
 */
MarketSockets.prototype._setPingWatchdog = function() {
    self._updateWatchdogClock();
    self.on("pong", () => {
        self._updateWatchdogClock();
    });

    if(self._pingWatchdog) {
        clearInterval(self._pingWatchdog);
    }
    self._pingWatchdog = setInterval(() => {
        if(self.isStuck()) {
            logger.log("Market sockets stopped answering");
        }
    }, 5 * 1000);
};
