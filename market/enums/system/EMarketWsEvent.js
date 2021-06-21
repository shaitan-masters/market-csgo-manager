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

    ItemAdd: "additem_go", // Предмет появился в вашем инвентаре на маркете
    ItemStatusChange: "itemstatus_go", // Поменялся статус предмета в вашем инвентаре маркета
    ItemOut: "itemout_new_go", // Предмет пропал из инвентаря на маркете (по разным причинам)

    MarketNewItemOffer: "newitems_go", // Выставлен новый предмет
    MarketNewItemBought: "history_go", // Куплен новый предмет на маркете

    InventoryUpdate: "invcache_go", // Кэш инвентаря Steam обновлен
    SetDirect: "setdirect", // Изменение статуса сообщения "Внимание! Вы не можете продавать!"

    AdminMessage: "imp_msg", // Важное сообщение от администрации
    Notification: "webnotify", // Ответ тех. поддержки
    BetNotificationCs: "webnotify_bets_cs", // Спам
    BetNotificationGo: "webnotify_bets_go", // Спам

    OnlineCheck: "onlinecheck", // На данный момент не знаю, что означает. Содержит какую-то рандомную строку в 10 символов
    SetOnline: "setonline", // На данный момент не знаю, что означает. Содерит либо ON либо OFF
};
Object.freeze(EMarketWsEvent);

module.exports = EMarketWsEvent;
