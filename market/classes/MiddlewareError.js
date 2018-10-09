"use strict";

module.exports = MiddlewareError;

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
    if(!(this instanceof MiddlewareError)) {
        return new MiddlewareError(message, type, source, errData);
    }

    this.name = "MiddlewareError";
    this.message = message;
    this.stack = (new Error()).stack;

    if(typeof source === "object") {
        errData = source;
        source = null;
    }
    if(source && !errData.source) {
        errData.source = source;
    }

    this.type = type;
    this.source = undefined;

    Object.assign(this, errData);
}

MiddlewareError.prototype = new Error;
