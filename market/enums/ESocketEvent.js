"use strict";

/**
 * @readonly
 * @enum {String}
 */
const ESocketEvent = {
    Connected: "connected",
    Error: "error",
    Message: "message",

    Auth: "authorized",
    DeAuth: "deauthorized",

    Pong: "pong",
    Stuck: "stuck",

    BalanceUpdate: "balance",

    ItemAdd: "itemAdd",
    ItemUpdate: "itemUpdate",
    ItemTake: "itemTake",
    ItemRemove: "itemRemove",
};
Object.freeze(ESocketEvent);

module.exports = ESocketEvent;
