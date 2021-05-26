// @ts-ignore
const MarketAPIProvider = require('src/helpers/get_market_API');
// @ts-ignore
const BadOffersCache = require('./lib/cache');
// @ts-ignore
const MarketWS = require('./lib/ws');
// @ts-ignore
const EventEmitter = require('events');
// @ts-ignore
const MarketKnapsack = require('./lib/knapsack');
const v1 = require('./versions/v1');
const v2 = require('./versions/v2');
const generalEmitter = require('./emitters');
module.exports = class MarketManager extends EventEmitter {
    constructor(initOptions) {
        super();
        /**
         * Set API key
         * @type {string}
         */
        this.APIKey = initOptions.APIKey;
        /**
         * Set default currency
         * @type {"USD" | "RUB" | "EUR"}
         */
        this.currency = initOptions.currency || this.currency;
        /**
         * Set API version
         * @type {string}
         */
        this.version = initOptions.version || this.version;
        /**
         *
         * Hold all event emitters in one module
         */
        this.emitEvent = generalEmitter.bind(this);
        /**
         * Init API provider lib locally or from repository WS client to get data from CSGO market
         */
        this.marketAPIProvider = new MarketAPIProvider({
            APIKey: initOptions.APIKey
        });
        /**
         * Init Node cache for bad offers
         * @type {BadOffersCache}
         */
        this.badOffersCache = new BadOffersCache({});
        this.knapsack = new MarketKnapsack({});
        /**
         * Init WS client to get data from CSGO market with `this` passed
         */
        this.marketWS = new MarketWS({
            marketAPIProvider: this.marketAPIProvider,
            version: this.version
        });
        /**
         * Create getter v1 to be called like Manager.v1.buy()
         * Not ready now for v2 has higher priority
         */
        Object.defineProperty(this, 'v1', { get: v1.bind(this) });
        /**
         * Create getter v2 to be called like Manager.v2.buy()
         */
        Object.defineProperty(this, 'v2', { get: v2.bind(this) });
        this[this.version].setWSEvents.call(this);
    }
};
