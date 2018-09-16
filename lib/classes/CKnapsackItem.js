"use strict";

module.exports = CKnapsackItem;

/**
 * @param {Object} opts
 * @constructor
 */
function CKnapsackItem(opts) {
    // todo

    this.uiId = 0;
    this.bId = 0;

    this.classId = 0;
    this.instanceId = 0;
    this.price = 0;

    this.status = "";

    this.trade = "";
    this.tradeUpdated = Date.now();

    this.timeLeft = 0;
}
