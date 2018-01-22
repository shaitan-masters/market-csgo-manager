"use strict";

/** @enum {String} */
module.exports = {
    Selling: 1, // Вещь выставлена на продажу.
    NeedToGive: 2, // Вы продали вещь и должны ее передать боту.
    Pending: 3, // Ожидание передачи боту купленной вами вещи от продавца.
    NeedToTake: 4, // Вы можете забрать купленную вещь.
    Delivered: 5, // We took this item and now can forget about it

    Unknown1: 6, // It exists in market scripts code, but IDK what does it mean
};
