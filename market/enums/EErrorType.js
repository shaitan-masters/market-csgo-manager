"use strict";

/**
 * @readonly
 * @enum {String}
 */
const EErrorType = {
    NotFound: "notFound", // необходимая сущность не найдена
    RequestFailed: "failedRequest", // маркет не вернул ответ success
    AttemptsFailed: "failedAttempts", // все поптыки выполнить действие провалились

    UnknownStage: "unknownStage",
    HistoryFailed: "historyFail",

    TooHighPrices: "tooHighPrices",
    NeedMoney: "needMoney",
    NeedToTake: "needToTake",
    BadOfferPrice: "badItemPrice",

    InvalidToken: "invalidLink", // invalid trade token provided
    InventoryClosed: "inventoryClosed",
    UnableOfflineTrade: "unableOfflineTrade",
};
Object.freeze(EErrorType);

module.exports = EErrorType;
