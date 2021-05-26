"use strict";
/**
 * @readonly
 * @enum {String}
 */
const EKnapsackEvent = {
    Update: 'knapsack_upd',
    ItemAdd: 'add',
    ItemUpdate: 'update',
    ItemExpired: 'expired',
    ItemAccepted: 'accepted',
    TradeSent: 'sent',
    TradeCanceled: 'canceled', // Отправленный трейд был отменен
};
Object.freeze(EKnapsackEvent);
module.exports = EKnapsackEvent;
