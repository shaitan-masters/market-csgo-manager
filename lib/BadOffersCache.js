"use strict";

const UPDATE_INTERVAL = 15 * 1000; // Auto-decreasing checker interval
const PENALTY_TIME = 30 * 60 * 1000; // In what period offer will loose one penalty point
const MIN_FAILS = 1; // Haw many points offer should have to be considered as bad

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
        if(this._counters.hasOwnProperty(hashid)) {
            let timePassed = Date.now() - this._counters[hashid].lastUpdate;

            if(timePassed > PENALTY_TIME) {
                this._counters[hashid].lastUpdate = Date.now();
                this._counters[hashid].fails -= 1;

                if(this._counters[hashid].fails <= 0) {
                    delete this._counters[hashid];
                }
            }
        }
    }
};

BadOffersCache.prototype._getHashId = function(item) {
    return item.instanceId + "_" + item.classId + "_" + item.price;
};
