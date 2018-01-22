"use strict";

/** @enum {String} */
module.exports = {
    Waiting: 1, // Ожидание передачи боту от продавца
    Ready: 2, // Мы забрали предмет или он готов, чтобы его забрали
    Unknown3: 3,
    Unknown4: 4,
    Unsuccessful: 5, // Покупка (не удалась)
};
