"use strict";

module.exports = ChangeableInterval;

/**
 * @param callback
 * @param interval
 * @constructor
 */
function ChangeableInterval(callback, interval) {
    this._callback = callback;
    this._time = interval;
    this._argv = Array.prototype.slice.call(arguments, 2);

    this._lastRun = Date.now();
    this._timeout = setTimeout(() => {
        this.execute();
    }, this._time);
}

ChangeableInterval.prototype.execute = function() {
    this._setTimer();

    this._lastRun = Date.now();
    this._callback.apply(null, this._argv);
};

ChangeableInterval.prototype._setTimer = function(time = this._time) {
    clearTimeout(this._timeout);

    this._timeout = setTimeout(() => {
        this.execute();
    }, time);
};

ChangeableInterval.prototype.change = function(interval) {
    if(interval === this._time) {
        return;
    }
    this._time = interval;

    let remainTime = Date.now() - this._lastRun - this._time;
    if(remainTime <= 0) {
        this.execute();
    } else {
        this._setTimer(remainTime);
    }
};
