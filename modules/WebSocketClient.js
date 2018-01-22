"use strict";

const EventEmitter = require("events").EventEmitter;
const WebSocket = require("uws");

/** @type {WebSocketClient} */
let self;

module.exports = WebSocketClient;

require("util").inherits(WebSocketClient, EventEmitter);

/**
 * Simple wrapper on ws library, that handles reconnection
 *
 * @constructor
 * @extends {EventEmitter}
 */
function WebSocketClient() {
    self = this;

    this.number = 0; // Message number
    this.autoReconnectInterval = 5 * 1000; // ms
    this.pingInterval = 15 * 1000; // ms

    this.connected = false;
}

WebSocketClient.prototype.open = function(url, opts) {
    this.url = url;
    this.opts = opts;

    this.autoReconnectInterval = opts._autoReconnectInterval || this.autoReconnectInterval;
    this.pingInterval = opts._pingInterval || this.pingInterval;

    this.instance = new WebSocket(this.url, opts);

    if(this.pingInterval) {
        this._pingTimer = setInterval(() => {
            self.ping();
        }, this.pingInterval);
    }

    this.instance.on("open", () => {
        this.connected = true;

        this.onOpen();
        this.emit("open");
    });
    this.instance.on("message", (data, flags) => {
        this.number++;

        this.onMessage(data, flags, this.number);
        this.emit("message", data, flags, this.number);
    });
    this.instance.on("close", (e) => {
        this.connected = false;

        switch(e) {
            case 1000:	// CLOSE_NORMAL
                console.log("WebSocket: closed");
                break;
            default:	// Abnormal closure
                this.reconnect(e, "close");
                break;
        }

        this.onClose(e);
        this.emit("close", e);
    });
    this.instance.on("error", (e) => {
        switch(e.code) {
            case "ECONNREFUSED":
                this.connected = false;
                this.reconnect(e, "error");
                break;
            default:
                this.onError(e);
                this.emit("error", e);
                break;
        }
    });
};

WebSocketClient.prototype.send = function(data, option) {
    try {
        this.instance.send(data, option);
    } catch(e) {
        this.instance.emit("error", e);
    }
};

WebSocketClient.prototype.reconnect = function(e, cause) {
    console.log(`WebSocketClient: connection closed by ${cause}, code: ${e}`);
    //console.log(`WebSocketClient: retry in ${this.autoReconnectInterval}ms`, e);

    this.instance.removeAllListeners();
    clearInterval(this._pingTimer);

    let that = this;
    setTimeout(() => {
        console.log("WebSocketClient: reconnecting...");

        that.open(that.url, that.opts);

        that.emit("reconnect", e);
    }, this.autoReconnectInterval);
};

WebSocketClient.prototype.ping = function() {
    this.instance.ping("ping");
};

// Default events
WebSocketClient.prototype.onOpen = function(e) {
    //console.log("WebSocketClient: open", arguments);
};

WebSocketClient.prototype.onMessage = function(data, flags, number) {
    //console.log("WebSocketClient: message", arguments);
};

WebSocketClient.prototype.onError = function(e) {
    //console.log("WebSocketClient: error", arguments);
};

WebSocketClient.prototype.onClose = function(e) {
    //console.log("WebSocketClient: closed", arguments);
};
