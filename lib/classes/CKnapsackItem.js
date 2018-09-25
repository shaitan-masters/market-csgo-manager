"use strict";

const EMarketItemStatus = require("../../market/enums/system/EMarketItemStatus");
const EKnapsackItemStatus = require("../enums/EKnapsackItemStatus");

module.exports = CKnapsackItem;

/**
 * @param {Object} opts
 * @constructor
 */
function CKnapsackItem(opts) {
    this.uiId = opts.ui_id;
    this.bId = opts.ui_bid;

    this.classId = opts.i_classid;
    this.instanceId = opts.i_instanceid;
    this.price = opts.ui_price;

    this.setStatus(opts);

    this.trade = null;
    this.tradeUpdated = Date.now();

    this.expireDate = Date.now() + opts.left * 1000;
}

CKnapsackItem.prototype.setStatus = function(code) {
    if(typeof code === "object") {
        code = code.ui_status;
    }
    if(!isNaN(code)) {
        switch(Number(code)) {
            case EMarketItemStatus.Pending:
                code = EKnapsackItemStatus.Pending;
                break;
            case EMarketItemStatus.NeedToTake:
                code = EKnapsackItemStatus.Sent;
                break;
            case EMarketItemStatus.Delivered:
                code = EKnapsackItemStatus.Accepted;
                break;
        }
    }

    this.status = code;
};

/**
 * @param {CKnapsackTrade} trade
 */
CKnapsackItem.prototype.setNewTrade = function(trade) {
    this.trade = trade;
    this.tradeUpdated = Date.now();
};

CKnapsackItem.prototype.getLeftTime = function() {
    return Math.max(this.expireDate - Date.now(), -1);
};
