"use strict";

/**
 * @readonly
 * @enum {String}
 */
const EKnapsackEvent = {
    Update: 'knapsack_upd', // Любое обновление содержимого, кроме обновления таймеров

    ItemAdd: 'add', // Предмет куплен
    ItemUpdate: 'update', // Предмет поменял состояние
    ItemExpired: 'expired', // Предмет не был отправлен и время истекло
    ItemAccepted: 'accepted', // Предмет был получен

    TradeSent: 'sent', // Отправлен новый трейд
    TradeCanceled: 'canceled', // Отправленный трейд был отменен
};
Object.freeze(EKnapsackEvent);

module.exports = EKnapsackEvent;
