"use strict";
/**
 * Статус действия на странице операций аккаунта(accountSummary)
 * @readonly
 * @enum {Number}
 */
const EMarketEventStage = {
    Waiting: 1,
    Ready: 2,
    Unknown3: 3,
    Unknown4: 4,
    Unsuccessful: 5,
    has: function (stage) {
        stage = Number(stage);
        return stage <= 5 && stage >= 1;
    },
};
Object.freeze(EMarketEventStage);
module.exports = EMarketEventStage;
