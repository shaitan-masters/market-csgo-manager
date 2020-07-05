"use strict";

module.exports = BadOffersCache;

/**
 * @param {CBadOffersConfig} config
 * @constructor
 */
function BadOffersCache(config) {
    this._config = config;

    this._commonCounters = {};
    this._preciseCounters = {};

    this.started = false;
}

BadOffersCache.prototype.start = function() {
    if(this.started) {
        return;
    }
    this.started = true;

    setInterval(() => {
        this._autoDecrease(this._commonCounters);
        this._autoDecrease(this._preciseCounters);
    }, this._config.updateInterval);
};

BadOffersCache.prototype.markAsBad = function(item) {
    let commonHash = this._getCommonHashId(item);
    let preciseHash = this._getPreciseHashId(item);

    this._updateCounter(this._commonCounters, commonHash);
    this._updateCounter(this._preciseCounters, preciseHash);
};

BadOffersCache.prototype.isBad = function(item) {
    let commonHash = this._getCommonHashId(item);
    let preciseHash = this._getPreciseHashId(item);

    if(this._commonCounters[commonHash] && this._commonCounters[commonHash].fails >= this._config.minCommonFails) {
        return true;
    }
    if(this._preciseCounters[preciseHash] && this._preciseCounters[preciseHash].fails >= this._config.minPreciseFails) {
        return true;
    }

    return false;
};

BadOffersCache.prototype._updateCounter = function(counter, hash) {
    if(!counter[hash]) {
        counter[hash] = {
            lastUpdate: Number.MAX_VALUE,
            fails: 0,
        };
    }

    counter[hash].lastUpdate = Date.now();
    counter[hash].fails += 1;
};

BadOffersCache.prototype._autoDecrease = function(counter) {
    for(let hashid in counter) {
        if(counter.hasOwnProperty(hashid)) {
            let timePassed = Date.now() - counter[hashid].lastUpdate;

            if(timePassed > this._config.penaltyTime) {
                counter[hashid].lastUpdate = Date.now();
                counter[hashid].fails -= 1;

                if(counter[hashid].fails <= 0) {
                    delete counter[hashid];
                }
            }
        }
    }
};

BadOffersCache.prototype._getCommonHashId = function(item) {
    return item.instanceId + "_" + item.classId;
};

BadOffersCache.prototype._getPreciseHashId = function(item) {
    return this._getCommonHashId(item) + "_" + item.price;
};
