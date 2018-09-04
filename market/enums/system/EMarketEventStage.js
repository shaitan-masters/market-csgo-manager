"use strict";

/**
 * Статус действия на странице операций аккаунта(accountSummary)
 * @readonly
 * @enum {Number}
 */
const EMarketEventStage = {
    Waiting: 1, // Ожидание передачи боту от продавца
    Ready: 2, // Мы забрали предмет или он готов к тому, чтобы его забрали
    Unknown3: 3,
    Unknown4: 4,
    Unsuccessful: 5, // Покупка (не удалась)
};
Object.freeze(EMarketEventStage);

module.exports = EMarketEventStage;
