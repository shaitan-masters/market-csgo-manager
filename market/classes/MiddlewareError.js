"use strict";

module.exports = MiddlewareError;

/**
 * @param {String?} message
 * @param {String?} type
 * @param {Object?} data
 * @constructor
 */
function MiddlewareError(message, type, data = {}) {
    let err = new Error(message);
    err.type = type;

    Object.assign(err, data);

    this.err = err;

    return err;
}
