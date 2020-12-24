"use strict";

/**
 * @readonly
 * @enum {String}
 */
const EErrorType = {
    NotFound: "notFound", // required entity not found
    RequestFailed: "failedRequest", // market did not return `success` response
    AttemptsFailed: "failedAttempts", // all attempts to execute the action have failed

    UnknownStage: "unknownStage",
    HistoryFailed: "historyFail",

    TooHighPrices: "tooHighPrices",
    NeedMoney: "needMoney",
    NeedToTake: "needToTake",
    BadOfferPrice: "badItemPrice",

    TradeCreationFailed: "tradeCreationFailed", // unused

    InvalidToken: "invalidLink", // invalid trade token provided
    InventoryClosed: "inventoryClosed",
    UnableOfflineTrade: "unableOfflineTrade",
    VacGameBan: "vacGameBan",
    CanceledTrades: "canceledTrades",
    BotCanceledTrades: "botCanceledTrades",
};
Object.freeze(EErrorType);

module.exports = EErrorType;
