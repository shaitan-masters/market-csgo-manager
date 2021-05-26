"use strict";
module.exports = MiddlewareError;
function errorExtend(message) {
    // Make this an instanceof Error.
    Object.setPrototypeOf(this.constructor.prototype, Error.prototype);
    // Creates the this.stack getter
    if (Error.captureStackTrace) {
        Error.captureStackTrace(this, this.constructor);
    }
    else {
        this.stack = (new Error()).stack;
    }
    // Fixes naming
    this.name = this.constructor.name;
    // Fixes message
    this.message = message;
}
/**
 * @param {String} message
 * @param {String} type
 * @param {String|Object?}source
 * @param {Object?} errData
 * @return {MiddlewareError}
 * @constructor
 * @extends {Error}
 */
function MiddlewareError(message, type, source = null, errData = {}) {
    if (!(this instanceof MiddlewareError)) {
        return new MiddlewareError(message, type, source, errData);
    }
    errorExtend.call(this, message);
    if (typeof source === "object") {
        errData = source;
        source = null;
    }
    if (source && !errData.source) {
        errData.source = source;
    }
    this.type = type;
    this.source = undefined;
    Object.assign(this, errData);
}
MiddlewareError.prototype.shortInfo = function (includeMessage = false) {
    let excluded = ["name"];
    if (!includeMessage) {
        excluded.push("message");
    }
    let data = {};
    Object.entries(this)
        .filter((ent) => !excluded.includes(ent[0]))
        .forEach((ent) => data[ent[0]] = ent[1]);
    return data;
};
