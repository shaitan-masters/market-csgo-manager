"use strict";

const UPDATE_INTERVAL = 15 * 1000;
const PENALTY_TIME = 5 * 60 * 1000;
const MIN_FAILS = 2;

module.exports = BadOffersCache;

/**
 * @constructor
 */
function BadOffersCache() {
    this._counters = {};

    this.started = false;
}

BadOffersCache.prototype.start = function() {
    if(this.started) {
        return;
    }
    this.started = true;

    setInterval(() => {
        this._autoDecrease();
    }, UPDATE_INTERVAL);
};

BadOffersCache.prototype.markAsBad = function(item) {
    let hashid = this._getHashId(item);

    if(!this._counters[hashid]) {
        this._counters[hashid] = {
            fails: 0,
            lastUpdate: Number.MAX_VALUE
        };
    }

    this._counters[hashid].lastUpdate = Date.now();
    this._counters[hashid].fails += 1;
};

BadOffersCache.prototype.isBad = function(item) {
    let hashid = this._getHashId(item);

    if(this._counters[hashid] && this._counters[hashid].fails >= MIN_FAILS) {
        return true;
    }

    return false;
};

BadOffersCache.prototype._autoDecrease = function() {
    for(let hashid in this._counters) {
        if(Date.now() - this._counters[hashid].lastUpdate > PENALTY_TIME) {
            this._counters[hashid].fails -= 1;

            if(this._counters[hashid].fails <= 0) {
                delete this._counters[hashid];
            }
        }
    }
};

BadOffersCache.prototype._getHashId = function(item) {
    return item.instanceId + "_" + item.classId + "_" + item.price;
};
