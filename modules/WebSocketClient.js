"use strict";

const EventEmitter = require("events").EventEmitter;
const WebSocket = require("ws");

const DEFAULTS = {
    pingInterval: 30 * 1000,
    minReconnectionDelay: 1000 + Math.random() * 2500,
    maxReconnectionDelay: 20 * 1000,
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

    this._setEventShortcuts();

    this._messageBuffer = [];
}

WebSocketClient.prototype.isConnected = function() {
    return this._connected;
};

/**
 * @param {Object} [wsOpts] - additional options for ws instance
 */
WebSocketClient.prototype.connect = function(wsOpts) {
    if(typeof wsOpts !== "undefined") {
        this._wsOpts = wsOpts;
    }
    if(typeof this._wsOpts === "undefined") {
        this._wsOpts = {};
    }

    if(this._attempts >= this._opts.maxRetries) {
        console.log("WebSocketClient: max retries reached", this._attempts, ">=", this._opts.maxRetries);
        return;
    }
    this._attempts++;

    // Connecting
    let ws = new WebSocket(this.url, [], this._wsOpts);
    if(this._opts.connectionTimeout) {
        this._connectTimeout = setTimeout(() => this._handleTimeout(), this._opts.connectionTimeout);
    }

    ws.on("open", () => this._handleOpen());
    ws.on("message", (data, flags) => this._handleMessage(data, flags));
    ws.on("close", (code, reason) => this._handleClose(code, reason));
    ws.on("error", (err) => this._handleError(err));

    this.instance = ws;

    if(this._opts.pingInterval) {
        this._pingTimer = setInterval(() => {
            this.ping();
        }, this._opts.pingInterval);
    }
};

WebSocketClient.prototype.reconnect = function(e, reason, forced = false) {
    if(this._reconnecting && !forced) {
        console.trace(`WebSocketClient: is already reconnecting`);
        return;
    }
    this._reconnecting = true;

    console.log(`WebSocketClient: connection closed by ${reason}, code: ${e}`);
    //console.log(`WebSocketClient: retry in ${this.autoReconnectInterval}ms`, e);

    if(this._connected) {
        this.disconnect(undefined, "reconnect");
    }

    setTimeout(() => {
        console.log(`WebSocketClient: reconnecting...`);

        this.connect();

        this.emit("reconnect", e, reason);
    }, this._getCurrentDelay());
};

WebSocketClient.prototype.disconnect = function(code, reason) {
    //console.log("disconnect");

    clearTimeout(this._uptimeTimeout);
    clearTimeout(this._connectTimeout);
    clearInterval(this._pingTimer);

    this.instance.close(code, reason);
    this.instance.removeAllListeners();
    this.instance = null;

    this._connected = false;
};

WebSocketClient.prototype.send = function(data, options) {
    if(!this.instance || this.instance.readyState !== WebSocket.OPEN) {
        this._messageBuffer.push([data, options]);

        return;
    }

    //console.log("ws send", data);

    this.instance.send(data, options, (err) => {
        if(err) {
            this.emit("error", err);
            return;
        }

        //console.log(data, "sent");
    });
};

WebSocketClient.prototype.ping = function() {
    if(!this.instance) {
        return;
    }

    this.instance.ping("ping");
};

WebSocketClient.prototype._setEventShortcuts = function() {
    this.on("open", () => this.onOpen());
    this.on("message", (data, number) => this.onMessage(data, number));
    this.on("close", (e, reconnecting) => this.onClose(e, reconnecting));
    this.on("error", (e) => this.onError(e));
};

WebSocketClient.prototype._handleOpen = function() {
    clearTimeout(this._connectTimeout);

    this._resetConnected(true);

    if(this._opts.minUptime) {
        this._uptimeTimeout = setTimeout(() => this._handleUptime(), this._opts.minUptime);
    } else {
        this._handleUptime();
    }

    this.emit("open");

    if(this._messageBuffer.length > 0) {
        console.log(`WebSocketClient: sending ${this._messageBuffer.length} buffered messages`);

        for(let i of this._messageBuffer) {
            this.send(i[0], i[1]);
        }

        this._messageBuffer = [];
    }
};

WebSocketClient.prototype._handleMessage = function(data) {
    this._number++;

    this.emit("message", data, this._number);
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

WebSocketClient.prototype._handleClose = function(code, reason) {
    this._resetConnected(false);

    switch(code) {
        case 1000:	// CLOSE_NORMAL
            console.log("WebSocketClient: closed");
            break;
        default:	// Abnormal closure
            this.reconnect(code, "close");
            break;
    }

    this.emit("close", code, this._reconnecting);
};

WebSocketClient.prototype._handleUptime = function() {
    this._attempts = -1;
};

WebSocketClient.prototype._handleTimeout = function() {
    if(!this.instance) {
        return;
    }
    if(this.instance.readyState === WebSocket.OPEN) {
        // our "open" event handler was set after the connection was opened
        return;
    }

    //console.log("ws connect timeout");

    this._resetConnected(false);

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

WebSocketClient.prototype._resetConnected = function(value) {
    this._reconnecting = false;
    this._connected = value;
}

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
