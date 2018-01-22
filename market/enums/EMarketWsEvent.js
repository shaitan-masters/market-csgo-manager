"use strict";

/** @enum {String} */
module.exports = {
    Pong: "pong",
    AuthFailed: "auth",
    BalanceUpdate: "money",
    ItemStatusChange: "itemstatus_go",
    InventoryUpdate: "invcache_go",
    ItemAdd: "additem_go",
    ItemOut: "itemout_new_go",
    Notification: "webnotify",
    BetNotificationCs: "webnotify_bets_cs",
    BetNotificationGo: "webnotify_bets_go",
    MarketNewItemOffer: "newitems_go",
    MarketNewItemBought: "history_go",
};
