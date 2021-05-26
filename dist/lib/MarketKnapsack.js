"use strict";
const ITEM_RECHECK_INTERVAL = 10 * 1000;
const EventEmitter = require("events").EventEmitter;
const EMarketItemStatus = require("../market/enums/system/EMarketItemStatus");
const EKnapsackItemStatus = require("./enums/EKnapsackItemStatus");
const ESocketEvent = require("../market/enums/ESocketEvent");
const EKnapsackEvent = require("./enums/EKnapsackEvent");
const CKnapsackItem = require("./classes/CKnapsackItem");
const CKnapsackTrade = require("./classes/CKnapsackTrade");
const ChangeableInterval = require("../../modules/ChangeableInterval");
module.exports = MarketKnapsack;
require("util").inherits(MarketKnapsack, EventEmitter);
/**
 * Manages: items list, their precise state/events, trades info/creation
 *
 * @param {CKnapsackConfig} config
 * @param {MarketLayer} layer
 * @param {MarketSockets} sockets
 * @param {console} [_logger]
 * @constructor
 * @extends {EventEmitter}
 */
function MarketKnapsack(config, layer, sockets, _logger = console) {
    this._config = config;
    /** @interface {console} */
    this._log = _logger;
    this.started = false;
    this._market = layer;
    this._sockets = sockets;
    /**
     * Indexed by item.ui_id
     * @type {Object.<Number, CKnapsackItem>}
     */
    this.items = {};
    /**
     * Indexed by Market bot id. We need it to avoid multiple requests of the same bot
     * @type {Object.<Number, CKnapsackTrade>}
     */
    this.trades = {};
}
MarketKnapsack.prototype.start = function () {
    if (this.started) {
        return;
    }
    this.started = true;
    this._log.trace("Starting knapsack");
    this._setCheckInterval();
    this._setWsEvents();
};
MarketKnapsack.prototype._setCheckInterval = function () {
    this._checker = new ChangeableInterval(() => this.check(), this._config.updateInterval);
};
MarketKnapsack.prototype._setWsEvents = function () {
    this._sockets.on(ESocketEvent.Auth, () => {
        this._checker.change(this._config.validationInterval);
    });
    this._sockets.on(ESocketEvent.DeAuth, () => {
        this._checker.change(this._config.updateInterval);
    });
    this._sockets.on(ESocketEvent.ItemAdd, (data) => {
        //console.log("itemAdd", data);
        let item = new CKnapsackItem(data);
        this._add(item, data);
    });
    this._sockets.on(ESocketEvent.ItemTake, (data) => {
        //console.log("itemTake", data);
        let item = this.items[data.ui_id];
        this._update(item, data);
    });
    this._sockets.on(ESocketEvent.ItemRemove, (data) => {
        //console.log("itemRemove", data);
        let item = this.items[data.ui_id];
        this._remove(item);
    });
};
MarketKnapsack.prototype.itemsCount = function () {
    let data = {
        pending: 0,
        sent: 0, // We are ready to take them or they are already sent
    };
    for (let id in this.items) {
        let item = this.items[id];
        switch (item.status) {
            case EKnapsackItemStatus.Pending:
                data.pending++;
                break;
            case EKnapsackItemStatus.Sent:
                data.sent++;
                break;
        }
    }
    return data;
};
/**
 * @param {CKnapsackItem} item
 * @param {Object} data
 * @private
 */
MarketKnapsack.prototype._add = function (item, data) {
    if (this.items[item.uiId]) {
        this._update(item, data);
        return;
    }
    this.items[item.uiId] = item;
    this.emit(EKnapsackEvent.ItemAdd, item);
    this.emit(EKnapsackEvent.Update);
};
/**
 * @param {CKnapsackItem} item
 * @param {Object} data
 * @private
 */
MarketKnapsack.prototype._update = function (item, data) {
    if (!item) {
        return; // Invalid action
    }
    if (item.status === data.status) {
        // todo
    }
    // todo
    this.emit(EKnapsackEvent.ItemUpdate, item);
    this.emit(EKnapsackEvent.Update);
};
/**
 * @param {CKnapsackItem} item
 * @private
 */
MarketKnapsack.prototype._remove = function (item) {
    if (!item) {
        return; // Invalid action
    }
    // todo
    this.emit(EKnapsackEvent.ItemAccepted, item);
    this.emit(EKnapsackEvent.Update);
};
MarketKnapsack.prototype.check = function () {
    // todo
};
//
//
// Deprecated
//
//
MarketKnapsack.prototype.add = function (item) {
    self.processItem(item);
};
MarketKnapsack.prototype.update = function (item) {
    self.processItem(item);
};
MarketKnapsack.prototype.processItem = function (item) {
    let updated = false;
    if (!self.items[item.ui_id]) {
        self.items[item.ui_id] = item;
        updated = self._changeCounters(item, 1);
    }
    else {
        let cItem = self.items[item.ui_id];
        if (cItem.ui_status !== item.ui_status) {
            self._changeCounters(cItem, -1);
            cItem.ui_status = item.ui_status;
            updated = self._changeCounters(cItem, 1);
        }
    }
    if (updated) {
        self.emit("updated");
    }
};
MarketKnapsack.prototype.remove = function (item) {
    let updated = false;
    if (self.items[item.ui_id]) {
        updated = self._changeCounters(self.items[item.ui_id], -1);
        delete self.items[item.ui_id];
    }
    if (updated) {
        self.emit("updated");
    }
};
// get real tm list and compare it with ours. In ideal world there should not be any changes
MarketKnapsack.prototype.__check = function () {
    return new Promise((res, rej) => {
        _market.getTrades().then((trades) => {
            let cPending = 0, cToTake = 0;
            let cItems = {};
            trades.forEach((item) => {
                if (item.ui_status === EMarketItemStatus.Pending) {
                    cPending++;
                }
                else if (item.ui_status === EMarketItemStatus.NeedToTake) {
                    cToTake++;
                }
                cItems[item.ui_id] = item;
            });
            let updated = self.pendingItemsCount !== cPending || self.takeItemsCount !== cToTake;
            self.pendingItemsCount = cPending;
            self.takeItemsCount = cToTake;
            self.items = cItems;
            self._lastCheck = Date.now();
            if (updated) {
                self.emit("updated");
            }
            res();
        }).catch((err) => {
            this._log.error(err);
        });
    });
};
