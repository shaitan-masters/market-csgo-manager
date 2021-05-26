"use strict";
/**
 * @readonly
 * @enum {String}
 */
const EErrorType = {
    NotFound: "notFound",
    RequestFailed: "failedRequest",
    AttemptsFailed: "failedAttempts",
    UnknownStage: "unknownStage",
    HistoryFailed: "historyFail",
    TooHighPrices: "tooHighPrices",
    NeedMoney: "needMoney",
    NeedToTake: "needToTake",
    BadOfferPrice: "badItemPrice",
    TradeCreationFailed: "tradeCreationFailed",
    InvalidToken: "invalidLink",
    InventoryClosed: "inventoryClosed",
    UnableOfflineTrade: "unableOfflineTrade",
    VacGameBan: "vacGameBan",
    CanceledTrades: "canceledTrades",
    BotCanceledTrades: "botCanceledTrades",
};
Object.freeze(EErrorType);
module.exports = EErrorType;
