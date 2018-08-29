"use strict";

const EventEmitter = require("events").EventEmitter;
const WebSocket = require("ws");

const DEFAULTS = {
    pingInterval: 30 * 1000,
    minReconnectionDelay: 1000 + Math.random() * 2500,
    maxReconnectionDelay: 15 * 1000,
    reconnectionDelayGrowFactor: 1.25,
    minUptime: 2.5 * 1000,
    maxRetries: Infinity,
    connectionTimeout: 5 * 1000,
};

module.exports = WebSocketClient;
require("util").inherits(WebSocketClient, EventEmitter);

/**
 * Simple wrapper on ws library, that handles reconnection
 *
 * @param {String} url
 * @param {Object} [opts]
 * @property {Number} [opts.pingInterval] - in ms
 * @constructor
 * @extends {EventEmitter}
 */
function WebSocketClient(url, opts) {
    this.url = url;

    this._opts = Object.assign({}, DEFAULTS, opts);

    this._attempts = -1;
    this._number = -1; // Message number

    this._reconnecting = false;
    this._connected = false;
}

WebSocketClient.prototype.isConnected = function() {
    return this._connected;
};

/**
 * @param {Object} [wsOpts] - additional options for ws instance
 */
WebSocketClient.prototype.connect = function(wsOpts) {
    this._wsOpts = wsOpts;

    if(this._attempts >= this._opts.maxRetries) {
        console.log("Max retries reached", this._attempts, ">=", this._opts.maxRetries);
        return;
    }
    this._attempts++;

    // Connecting
    let ws = new WebSocket(this.url, [], wsOpts);
    if(this._opts.connectionTimeout) {
        this._connectTimeout = setTimeout(() => this._handleTimeout(), this._opts.connectionTimeout);
    }

    ws.on("open", () => this._handleOpen());
    ws.on("message", (data, flags) => this._handleMessage(data, flags));
    ws.on("close", (e) => this._handleClose(e));
    ws.on("error", (e) => this._handleError(e));

    this.on("open", () => this.onOpen());
    this.on("message", (data, flags, number) => this.onMessage(data, flags, number));
    this.on("close", (e, reconnecting) => this.onClose(e, reconnecting));
    this.on("error", (e) => this.onError(e));

    this.instance = ws;

    if(this._opts.pingInterval) {
        this._pingTimer = setInterval(() => {
            this.ping();
        }, this._opts.pingInterval);
    }
};

WebSocketClient.prototype.reconnect = function(e, reason) {
    if(this._reconnecting) {
        return;
    }
    this._reconnecting = true;

    console.log(`WebSocketClient: connection closed by ${reason}, code: ${e}`);
    //console.log(`WebSocketClient: retry in ${this.autoReconnectInterval}ms`, e);

    setTimeout(() => {
        console.log("WebSocketClient: reconnecting...");

        this.open(this._wsOpts);

        this.emit("reconnect", e, reason);
    }, this._getCurrentDelay());
};

WebSocketClient.prototype.disconnect = function(code, reason) {
    clearTimeout(this._uptimeTimeout);
    clearTimeout(this._connectTimeout);
    clearInterval(this._pingTimer);

    this.instance.close(code, reason);
    this.instance.removeAllListeners();
    this.instance = null;

    this._connected = false;
};

WebSocketClient.prototype.send = function(data, options) {
    this.instance.send(data, options, function(err) {
        this.emit("error", err);
    });
};

WebSocketClient.prototype.ping = function() {
    this.instance.ping("ping");
};

WebSocketClient.prototype._handleOpen = function() {
    this._connected = true;
    this._reconnecting = false;

    if(this._opts.minUptime) {
        this._uptimeTimeout = setTimeout(() => this._handleUptime(), this._opts.minUptime);
    } else {
        this._handleUptime();
    }

    this.emit("open");
};

WebSocketClient.prototype._handleMessage = function(data, flags) {
    this._number++;

    this.emit("message", data, flags, this._number);
};

WebSocketClient.prototype._handleError = function(e) {
    switch(e.code) {
        case "ECONNREFUSED":
            this.reconnect(e, "error");
            break;
        default:
            this.emit("error", e);
            break;
    }
};

WebSocketClient.prototype._handleClose = function(e) {
    this._connected = false;

    switch(e) {
        case 1000:	// CLOSE_NORMAL
            console.log("WebSocket: closed");
            break;
        default:	// Abnormal closure
            this.reconnect(e, "close");
            break;
    }

    this.emit("close", e, this._reconnecting);
};

WebSocketClient.prototype._handleUptime = function() {
    this._attempts = -1;
};

WebSocketClient.prototype._handleTimeout = function() {
    this.disconnect(undefined, "timeout");
};

WebSocketClient.prototype._getCurrentDelay = function() {
    if(this._attempts > 0) {
        let minDelay = this._opts.minReconnectionDelay;
        let maxDelay = this._opts.maxReconnectionDelay;
        let growFactor = this._opts.reconnectionDelayGrowFactor;

        return Math.min(maxDelay, minDelay + Math.pow(this._attempts - 1, growFactor));
    }

    return 0;
};

// Default events
WebSocketClient.prototype.onOpen = function() {
    //console.log("WebSocketClient: open", arguments);
};
WebSocketClient.prototype.onMessage = function(data, flags, number) {
    //console.log("WebSocketClient: message", arguments);
};
WebSocketClient.prototype.onError = function(e) {
    //console.log("WebSocketClient: error", arguments);
};
WebSocketClient.prototype.onClose = function(e, reconnecting) {
    //console.log("WebSocketClient: closed", arguments);
};
