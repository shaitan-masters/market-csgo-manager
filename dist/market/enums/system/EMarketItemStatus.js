"use strict";
/**
 * Текущий статус прдмета в инвентаре маркета, возвращаемый методом `Trades`
 * @readonly
 * @enum {Number}
 */
const EMarketItemStatus = {
    Selling: 1,
    NeedToGive: 2,
    Pending: 3,
    NeedToTake: 4,
    Delivered: 5,
    Unknown1: 6, // It exists in market scripts code, but IDK what does it mean
};
Object.freeze(EMarketItemStatus);
module.exports = EMarketItemStatus;
