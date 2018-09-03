"use strict";

const EventEmitter = require("events").EventEmitter;

const EMarketItemStatus = require("./enums/EMarketItemStatus");

const logger = global.logger;

/** @type {MarketKnapsack} */
let self;

/** @type {OPMarketLayer} */
let _market;

module.exports = MarketKnapsack;

require("util").inherits(MarketKnapsack, EventEmitter);

/**
 * @param {OPMarketLayer} opts.market
 * @param {Number} [opts.checkInterval] - Period if checking knapsack for consistency
 * @param {Number} [opts.checkIntervalWithWs] - Period of checking if we connected to market sockets
 * @constructor
 * @extends {EventEmitter}
 */
function MarketKnapsack(opts) {
    self = this;

    _market = opts.market;

    this._checkInterval = opts.checkInterval || 15 * 1000;
    this._checkIntervalWithWs = opts.checkIntervalWithWs || this.checkInterval * 4;

    this._lastCheck = Date.now();

    /**
     * Indexed by item.ui_id
     * @type {{Number: Object}}
     */
    this.items = {};

    /** @readonly */
    this.pendingItemsCount = 0;
    /** @readonly */
    this.takeItemsCount = 0;
}

MarketKnapsack.prototype.start = function() {
    self.check().then(() => {
        setInterval(() => {
            let currentInterval = _market.ws.isConnected() ? self._checkIntervalWithWs : self._checkInterval;

            if(Date.now - self._lastCheck >= currentInterval) {
                self.check();
            }
        }, self._checkInterval);
    });

    FnExtensions.setWatcher(this.requestBalanceUpdate, self.balanceUpdateInterval, this);
};

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

MarketKnapsack.prototype._changeCounters = function(item, delta) {
    let updated = false;

    if(item.ui_status === EMarketItemStatus.Pending) {
        self.pendingItemsCount += delta;

        updated = true;
    } else if(item.ui_status === EMarketItemStatus.NeedToTake) {
        self.takeItemsCount += delta;

        updated = true;
    }

    return updated;
};

// get real tm list and compare it with ours. In ideal world there should not be any changes
MarketKnapsack.prototype.check = function() {
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
