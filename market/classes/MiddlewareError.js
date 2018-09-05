"use strict";

module.exports = MiddlewareError;

/**
 * @param {String} message
 * @param {String} type
 * @param {String|Object?}source
 * @param {Object?} errData
 * @constructor
 */
function MiddlewareError(message, type, source = null, errData = {}) {
    if(typeof source === "object") {
        errData = source;
        source = null;
    }
    if(source && !errData.source) {
        errData.source = source;
    }

    let err = new Error(message);
    err.type = type;

    Object.assign(err, errData);

    this.err = err;

    return err;
}
