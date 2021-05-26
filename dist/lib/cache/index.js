// @ts-ignore
const NodeCache = require("node-cache");
module.exports = class BadOffersCache {
    constructor(initOptions) {
        this.state = {
            penaltyTime: 0,
            TTL: 100,
            started: false,
            countersAreShared: false,
            updateInterval: 100
        };
        this.globalCommonCounter = {};
        this.globalPreciseCounter = {};
        this.cache = new NodeCache({
            stdTTL: initOptions.TTL,
        });
        this.state = {
            ...this.state,
            ...initOptions
        };
        this.initIntervals();
    }
    initIntervals() {
        setInterval(() => {
            this.decreaseCounter(this.globalCommonCounter);
            this.decreaseCounter(this.globalPreciseCounter);
        }, this.state.updateInterval);
    }
    getCommonHashId(item) {
        return item.instanceId + "_" + item.classId;
    }
    ;
    getPreciseHashId(item) {
        return this.getCommonHashId(item) + "_" + item.price;
    }
    ;
    findItemById(id) {
        return this.cache.get(id.toString());
    }
    ;
    markAsBad(item) {
        let commonHash = this.getCommonHashId(item);
        this.updateCounter(this.globalCommonCounter, commonHash);
        if (item.price === undefined) {
            let preciseHash = this.getPreciseHashId(item);
            this.updateCounter(this.globalPreciseCounter, preciseHash);
        }
    }
    ;
    decreaseCounter(counter) {
        Object.keys(counter).map(hashId => {
            let timePassed = Date.now() - counter[hashId].lastUpdate;
            let penaltyTimedOut = timePassed > this.state.penaltyTime;
            if (penaltyTimedOut) {
                counter[hashId].lastUpdate = Date.now();
                counter[hashId].fails -= 1;
                if (counter[hashId].fails <= 0) {
                    delete counter[hashId];
                }
            }
        });
    }
    updateCounter(counter, hashId) {
        const CURRENT_COUNTER = counter[hashId] || {
            lastUpdate: Date.now(),
            fails: 0
        };
        counter[hashId] = {
            ...CURRENT_COUNTER,
            lastUpdate: Date.now(),
            fails: CURRENT_COUNTER + 1
        };
    }
    storeBoughtOffer(boughtItem) {
        this.cache.set(boughtItem.uiId.toString(), {
            instanceId: boughtItem.instanceId,
            classId: boughtItem.classId,
            price: boughtItem.offerPrice,
        });
    }
    ;
};
