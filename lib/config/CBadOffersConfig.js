"use strict";

module.exports = CBadOffersConfig;

/**
 * @param {Object} opts
 * @constructor
 */
function CBadOffersConfig(opts) {
    this.updateInterval = Number(opts.updateInterval || 20 * 1000); // Auto-decreasing checker interval
    this.penaltyTime = Number(opts.penaltyTime || 60 * 60 * 1000); // In what period offer will loose one penalty point

    this.minPreciseFails = Number(opts.minPreciseFails || 1);
    this.minCommonFails = Number(opts.minCommonFails || 5);
}
