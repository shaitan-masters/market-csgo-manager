"use strict";
/**
 * @readonly
 * @enum {String}
 */
const EErrorSource = {
    Market: "market",
    Bot: "bot",
    Owner: "owner",
    User: "user",
    Random: "random", // некоторый фактор рандома вызвал ошибку
};
Object.freeze(EErrorSource);
module.exports = EErrorSource;
