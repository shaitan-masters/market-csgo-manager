"use strict";
/**
 * Типы событий, которые могут придти по сокетам от маркета
 * @readonly
 * @enum {String}
 */
const EMarketWsEvent = {
    Pong: "pong",
    AuthFailed: "auth",
    BalanceUpdate: "money",
    ItemAdd: "additem_go",
    ItemStatusChange: "itemstatus_go",
    ItemOut: "itemout_new_go",
    MarketNewItemOffer: "newitems_go",
    MarketNewItemBought: "history_go",
    InventoryUpdate: "invcache_go",
    SetDirect: "setdirect",
    AdminMessage: "imp_msg",
    Notification: "webnotify",
    BetNotificationCs: "webnotify_bets_cs",
    BetNotificationGo: "webnotify_bets_go",
    OnlineCheck: "onlinecheck",
    SetOnline: "setonline", // На данный момент не знаю, что означает. Содерит либо ON либо OFF
};
Object.freeze(EMarketWsEvent);
module.exports = EMarketWsEvent;
