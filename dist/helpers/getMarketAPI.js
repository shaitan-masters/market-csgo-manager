module.exports = Object.freeze(['v1', 'v2']);
const { CRASH_EMITTER, CLIENT_ERROR_EMITTER } = require("@emitters");
const DICTIONARY = require('../../json/dictionary.json');
const CSGO_MARKET_API_NPM_LIB = require("market-csgo-api");
const IS_DEV = !!["development", "test"].find((env) => process.env.NODE_ENV === env);
module.exports = (initOptions) => {
    try {
        const LIB = IS_DEV
            ? require("./../../market-csgo-api")
            : CSGO_MARKET_API_NPM_LIB;
        const CSGO_MARKET_API_PROVIDER = initOptions.marketAPIProvider || new LIB({ APIKey: initOptions.APIKey });
        const RANDOM_NUM = Math.floor(Math.random() * (1000000 - 1)) + 1;
        const { customParam, APIKey } = CSGO_MARKET_API_PROVIDER.test(RANDOM_NUM);
        if (RANDOM_NUM !== customParam) {
            throw {
                emitter: CRASH_EMITTER,
                error: DICTIONARY.crash_errors.cant_init_library
            };
        }
        if (initOptions.APIKey !== APIKey) {
            throw {
                emitter: CLIENT_ERROR_EMITTER,
                error: DICTIONARY.client_errors.different_API_keys
            };
        }
    }
    catch (ex) { }
    {
        (ex.emitter || CRASH_EMITTER).emit('error', ex.error);
    }
};
