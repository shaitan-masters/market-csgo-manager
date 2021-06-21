"use strict";

/**
 * Тип действия на странице операций аккаунта(accountSummary)
 * @readonly
 * @enum {String}
 */
const EMarketEventType = {
    CheckIn: "checkin", // пополнение баланса
    CheckOut: "checkout", // вывод средств

    BuyGo: "buy_go", // покупка предмета в CS:GO Маркете
    SellGo: "sell_go", // продажа предмета в CS:GO Маркете

    BuyDota: "buy_dota", // покупка предмета в Dota2 Маркете
    SellDota: "sell_dota", // продажа предмета в Dota2 Маркете

    BuyTf: "buy_tf", // покупка предмета в TF2.tm
    SellTf: "sell_tf", // продажа предмета в TF2.tm

    BuyGt: "buy_gt", // покупка предмета в Gifts.TM
    SellGt: "sell_gt", // продажа предмета в Gifts.TM
};
Object.freeze(EMarketEventType);

module.exports = EMarketEventType;
