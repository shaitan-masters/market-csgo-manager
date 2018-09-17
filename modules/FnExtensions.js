"use strict";

module.exports = FnExtensions;

function FnExtensions() {
}

FnExtensions.setWatcher = function(fn, interval, caller = null) {
    if(isNaN(interval)) {
        throw new Error("Interval can not be NaN");
    }

    let intervalId = setInterval(() => fn.apply(caller), interval);

    fn.apply(caller);

    return intervalId;
};

FnExtensions.getRandomElement = function(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
};
