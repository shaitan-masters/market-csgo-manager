"use strict";
/**
 * Тип действия на странице операций аккаунта(accountSummary)
 * @readonly
 * @enum {String}
 */
const EMarketEventType = {
    CheckIn: "checkin",
    CheckOut: "checkout",
    BuyGo: "buy_go",
    SellGo: "sell_go",
    BuyDota: "buy_dota",
    SellDota: "sell_dota",
    BuyTf: "buy_tf",
    SellTf: "sell_tf",
    BuyGt: "buy_gt",
    SellGt: "sell_gt", // продажа предмета в Gifts.TM
};
Object.freeze(EMarketEventType);
module.exports = EMarketEventType;
