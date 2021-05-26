const CSGO_MARKET_API_NPM_LIB = require("market-csgo-api");

/**
 *
 * @param {string} version
 * @returns {ClassDecorator}
 * Returns API provider from local repo for dev or from npm
 */
module.exports = function (version: string){

    const IS_DEV = ["development", "test"].includes(process.env.NODE_ENV);


    const APIProviderBase = IS_DEV
        ? require("./../../../market-csgo-api/dist")
        : CSGO_MARKET_API_NPM_LIB;

    /**
     * A simple decorator to pre-process API errors and to raise them on manager level if they are server-side
     * or return them to the initiator
     * @type {ClassDecorator}
     */
    const APIProvider = class extends APIProviderBase {
        constructor() {
            super();

            Object.keys(APIProvider[version]).map(method => {
                APIProvider[version][method] = async function (params: object) {
                    try {
                        return APIProviderBase[version][method](params)
                    } catch (error: {code: number} | any) {
                        if (error.code >= 500) {
                            return this.emit('APICrash', error)
                        } else {
                            throw error;
                        }
                    }
                }
            })
        }
    };

    return APIProvider;

};

