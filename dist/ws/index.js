const WS = require("ws");
const CONFIG = require("config");
const WS_PARAMS = CONFIG.get("wsParams");
const { WS_ERROR_EMITTER } = require("@emitters");
const ENUM_MESSAGES = require("market-csgo-manager-master/wsconst WS = require(", ws, "););
const CONFIG = require("config");
const WS_PARAMS = CONFIG.get("wsParams");
const { WS_ERROR_EMITTER } = require("@emitters");
const ENUM_MESSAGES = require("market-csgo-manager-master/ws/enums/outgoing_messages");
const PROCESS_MESSAGE = require("./helpers/process_message");
const SUBSCRIBE_TO_CHANNELS = require("./methods/sunscribe_to_channels");
module.exports = function (WSParams) {
    const VERSION = WSParams.version;
    const CHANNELS = WSParams.channels;
    const CSGO_MARKET_API_PROVIDER = WSParams.marketAPIProvider;
    const CSGO_MARKET_WEBSCOKET = new WS(WSParams.URL);
    CSGO_MARKET_WEBSCOKET.on("error", (error) => WS_ERROR_EMITTER.emit("error", error));
    CSGO_MARKET_WEBSCOKET.on("open", () => {
        CSGO_MARKET_WEBSCOKET.#auth().then(() => {
            SUBSCRIBE_TO_CHANNELS.call(CSGO_MARKET_WEBSCOKET, CHANNELS);
        });
    });
    CSGO_MARKET_WEBSCOKET.#auth = function () {
        CSGO_MARKET_API_PROVIDER[VERSION].getWSAuth().then((secretKey) => CSGO_MARKET_WEBSCOKET.send(secretKey));
    };
    CSGO_MARKET_WEBSCOKET.#_ping = function () {
        CSGO_MARKET_WEBSCOKET.send(ENUM_MESSAGES.ping);
    };
    CSGO_MARKET_WEBSCOKET.on("message", (message) => PROCESS_MESSAGE(message, WSParams).then((processedMessage) => WSParams[VERSION].messageCallback(processedMessage)));
    CSGO_MARKET_WEBSCOKET.on("close", () => { });
    return CSGO_MARKET_WEBSCOKET;
};
