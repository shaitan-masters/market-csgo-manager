"use strict";

const merge = require("merge");
const tracer = require("tracer");

module.exports = Logger;

/**
 * Simple logger wrapper
 *
 * @param {object} config
 * @returns {Logger}
 * @constructor
 */
function Logger(config) {
    if(!(this instanceof Logger)) {
        return new Logger(config);
    }

    this._config = merge.clone(config);

    this.worker = tracer.console(this._config);
}

Logger.prototype.clone = function(config) {
    let newConfig = merge.recursive(true, this._config, config);

    return new Logger(newConfig);
};

/**
 * Logs any set of data
 */
Logger.prototype.log = function() {
    this._callMethod("log", arguments);
};

/**
 * Logs any set of data
 */
Logger.prototype.trace = function() {
    this._callMethod("trace", arguments);
};

/**
 * Logs any set of data
 */
Logger.prototype.info = function() {
    this._callMethod("info", arguments);
};

/**
 * Logs any set of data
 */
Logger.prototype.warn = function() {
    this._callMethod("warn", arguments);
};

/**
 * Logs any set of data
 */
Logger.prototype.error = function() {
    this._callMethod("error", arguments);
};

Logger.prototype._callMethod = function(name, args) {
    this.worker[name].apply(this.worker, parseArguments(args));
};

function parseArguments(args) {
    return [].slice.call(args);
}
