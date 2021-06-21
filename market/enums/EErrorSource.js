"use strict";

/**
 * @readonly
 * @enum {String}
 */
const EErrorSource = {
    Market: "market", // ошибка на маркете, кто-то уже покупает предмет
    Bot: "bot", // not used
    Owner: "owner", // не пополнен бот, нет предмета, дорогие предметы
    User: "user", // недоступен трейд
    Random: "random", // некоторый фактор рандома вызвал ошибку
};
Object.freeze(EErrorSource);

module.exports = EErrorSource;
