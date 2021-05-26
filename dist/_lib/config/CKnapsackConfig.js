"use strict";
module.exports = CKnapsackConfig;
/**
 * @param {Object} opts
 * @constructor
 */
function CKnapsackConfig(opts) {
    this.validationInterval = opts.validationInterval || 60 * 1000;
    this.updateInterval = opts.updateInterval || 20 * 1000;
}
