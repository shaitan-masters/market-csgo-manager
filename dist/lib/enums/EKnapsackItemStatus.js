"use strict";
/**
 * @readonly
 * @enum {String}
 */
const EKnapsackItemStatus = {
    Pending: 'pending',
    Sent: 'sent',
    Accepted: 'accepted',
    Canceled: 'canceled', // трейд был отменен одной из сторон (предмет больше не будет отправлен)
};
Object.freeze(EKnapsackItemStatus);
module.exports = EKnapsackItemStatus;
