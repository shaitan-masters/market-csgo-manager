"use strict";

// Logic specific constants
const WATCHDOG_TIME = 60 * 1000;
const WATCHDOG_INTERVAL = 5 * 1000;

// Market specific things
const WS_URL = "wss://wsn.dota2.net/wsn/";
const DEFAULT_LEFT_TIME = -1;

const EventEmitter = require("events").EventEmitter;

const EMarketWsEvent = require("./enums/EMarketWsEvent");
const EMarketMessage = require("./enums/EMarketMessage");
const EMarketItemStatus = require("./enums/EMarketItemStatus");

const WebSocketClient = require("../modules/WebSocketClient");

module.exports = MarketSockets;
require("util").inherits(MarketSockets, EventEmitter);

/**
 * @param {MarketLayer} opts.layer - market layer. We need it to obtain auth code
 * @param {HttpsProxyAgent} [opts.proxy=null] - proxy agent for connection to sockets
 * @param {Number} [opts.pingInterval=15000] - interval to ping in milliseconds
 * @constructor
 * @extends {EventEmitter}
 */
function MarketSockets(opts) {
    /** @var {MarketLayer} */
    this._layer = opts.layer;

    this._pingInterval = opts.pingInterval || 30 * 1000;
    this._proxy = opts.proxy || null;

    this._authorized = false;

    this.ws = this._createWebSockets();
}

/**
 * Starts WS session
 */
MarketSockets.prototype.start = function() {
    this.ws.open({
        agent: this._proxy
    });

    this._setPingWatchdog();
};

/**
 * @return {Boolean} - are we currently connected to sockets
 */
MarketSockets.prototype.isConnected = function() {
    return this.ws.isConnected() && this._authorized && !this.isStuck();
};

/**
 * Creates new connection object, but doesn't establish it
 * @return {WebSocketClient}
 * @private
 */
MarketSockets.prototype._createWebSockets = function() {
    let wsClient = new WebSocketClient(WS_URL, {
        pingInterval: this._pingInterval,
        minReconnectionDelay: (1 + Math.random()) * 1000,
        maxReconnectionDelay: 7500,
    });

    // Custom ping/pong procedure
    wsClient.ping = function() {
        this.send("ping");
    };

    // Bind events
    wsClient.on("open", () => {
        this.emit("connected");

        this._auth();
    });
    wsClient.on("message", (msg) => {
        //console.log("ws msg: ", msg);

        this._handleMsg(msg);
    });
    wsClient.on("error", (err) => {
        this.emit("error", err);
    });
    wsClient.on("close", () => {
        this._authorized = false;
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
 * @todo
 */
MarketSockets.prototype._handleMsg = function(msg) {
    //console.log(msg);

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
 * @todo
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
            update: false,
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
            update: true,
        };

        if(prepared.ui_status === EMarketItemStatus.NeedToTake) {
            prepared.ui_bid = Number(data.bid);
            prepared.left = Number(data.left || DEFAULT_LEFT_TIME);

            self.emit("itemTake", prepared);
        } else if(prepared.ui_status === EMarketItemStatus.Delivered) {
            self.emit("itemRemove", prepared);
        } else if(prepared.ui_status === EMarketItemStatus.Pending) {
            prepared.left = Number(data.left || DEFAULT_LEFT_TIME);

            self.emit("itemUpdate", prepared);
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
MarketSockets.prototype._auth = function() {
    this._layer._getWsAuth().then((authKey) => {
        this.ws.send(authKey);
        this.ws.ping();

        this._authorized = true;
    });
};

/**
 * Finds float number int text, multiplies in by 100 and rounds to avoid floating point problems
 * @param {String} rawBalance
 * @return {Number}
 * @private
 */
MarketSockets.prototype._extractFloatNumber = function(rawBalance) {
    return Math.round(parseFloat(rawBalance.replace(/[^\d.]*/g, "")) * 100);
};

/**
 * Says if sockets is stuck and didn't communicate for too long
 * @return {Boolean}
 */
MarketSockets.prototype.isStuck = function() {
    return this._watchdogTime + WATCHDOG_TIME - Date.now() < 0;
};

/**
 * @private
 */
MarketSockets.prototype._updateWatchdogClock = function() {
    this._watchdogTime = Date.now();
};

/**
 * @private
 */
MarketSockets.prototype._setPingWatchdog = function() {
    if(this._pingWatchdog) {
        return;
    }

    // Set timer
    this._updateWatchdogClock();
    this.ws.on("message", () => this._updateWatchdogClock());

    // Set watcher
    this._pingWatchdog = setInterval(() => {
        if(this.isStuck()) {
            //console.log("Market sockets stopped answering");

            this.emit("stuck");
        }
    }, WATCHDOG_INTERVAL);
};
