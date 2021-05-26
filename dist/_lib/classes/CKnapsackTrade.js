"use strict";
module.exports = CKnapsackTrade;
/**
 * @param {Object} data
 * @param {CKnapsackItem?} item
 * @constructor
 */
function CKnapsackTrade(data, item = null) {
    this.tradeId = data.trade_id;
    this.bid = data.bot_id;
    this.time = data.time;
    this._secret = data.secret;
    this.items = [];
    if (item) {
        this.addItem(item);
    }
}
/**
 * @param {CKnapsackItem?} item
 */
CKnapsackTrade.prototype.addItem = function (item) {
    item.setNewTrade(this);
    this.items.push(item);
};
