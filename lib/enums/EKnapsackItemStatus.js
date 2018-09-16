"use strict";

/**
 * @readonly
 * @enum {String}
 */
const EKnapsackItemStatus = {
    Pending: 'pending', // куплен, ожидаем продавца
    Sent: 'sent', // отправлен пользоватею/нам
    Accepted: 'accepted', // трейд принят
    Canceled: 'canceled', // трейд был отменен одной из сторон (предмет больше не будет отправлен)
};
Object.freeze(EKnapsackItemStatus);

module.exports = EKnapsackItemStatus;
