const WS = require("ws");
const ReconnectingWebSocket = require("reconnecting-websocket");
// @ts-ignore
const EventEmitter = require("events");

// @ts-ignore
const CONFIG = require("config").get('ws');
const WS_PARAMS = CONFIG.get("wsParams");
const {WS_ERROR_EMITTER} = require("@emitters");
const ENUM_MESSAGES = require("market-csgo-manager-master/ws");

const WS = require("ws");
const CONFIG = require("config");
const WS_PARAMS = CONFIG.get("wsParams");
const {WS_ERROR_EMITTER} = require("@emitters");
const ENUM_MESSAGES = require("market-csgo-manager-master/ws/enums/outgoing_messages");
const processMessage = require("./methods/process_message");
const subscribeToChannels = require("./methods/subscribe_to_channels");

const initAuth = require("src/lib/ws/init/auth");
const initPing = require("src/lib/ws/init/ping");
const initCheckIfStuck = require('./init/check_if_stuck');

module.exports = class MarketWS extends EventEmitter {
    version: string;
    channels: [string];
    marketAPIProvider: object;
    WSClient: typeof ReconnectingWebSocket;
    stuckCheckTime: number;
    isStuck: boolean;
    stuckDetectionInterval: object;

    constructor(initProps: {
        version: string;
        channels: [string];
        marketAPIProvider: Function;
        URL: string;
    }) {
        super();

        this.version = initProps.version;
        this.channels = initProps.channels;
        this.marketAPIProvider = initProps.marketAPIProvider;
        this.stuckCheckTime = Date.now();
        this.isStuck = false;

        this.setWSClient();
        this.initAuth = initAuth.bind(this);
        this.initPing = initPing.bind(this);
        this.subscribeToChannels = subscribeToChannels.bind(this);
        this.initCheckIfStuck = initCheckIfStuck.bind(this);
        this.processMessage = processMessage.bind(this);
    }


    setWSClient(){
        this.WSClient = new ReconnectingWebSocket(CONFIG.URL, {
            WebSocket: WS,
            connectionTimeout: CONFIG.connection_timeout,
            reconnectionDelayGrowFactor: CONFIG.reconnection_delay_grow_factor,
            maxRetries: CONFIG.max_retries,
        });

        return this.setEventsCallbacks();
    }

    setEventsCallbacks() {
        /**
         * ========================================================================
         * WS events processing
         * ========================================================================
         */
        /**
         * Catch errors
         */
        this.WSClient.on("error", (error) => {
            this.emit('error', error)
        });

        /**
         * Auth to get new key and send it to WS server
         */
        this.WSClient.on("open", () => this.auth()
            .then(() => {

                /**
                 * ========================================================================
                 * Init intervals & tasks
                 * ========================================================================
                 */

                initAuth();
                initPing();
                initCheckIfStuck();
                subscribeToChannels.call(this, this.WSClient, this.channels);

                this.emit('open')
            }));

        this.WSClient.on("message", (message: JSON) => {
            this.initCheckIfStuck();
            this.processMessage(message);
        });

        this.WSClient.on("close", () => {
            this.reconnect();
        });
    }

    /**
     * ========================================================================
     * WS methods without arguments
     * ========================================================================
     */


    /**
     * Ping WS server to keep connection alive
     */
    async ping() {

        this.WSClient.send(ENUM_MESSAGES.ping);
    };


    /**
     * Auth to get new key and send it to WS server
     */
    async auth() {
        this
            .marketAPIProvider[this.version]
            .getWSAuth()
            .then(this.WSClient.send);
    };

    reconnect() {
        return this.setWSClient();

    }

    get isConnected() {
        return this.WSClient.readyState == 1;
    }

    processStuckStatus(isStuck: boolean = false) {
        this.isStuck = isStuck;

        if  (isStuck)  {
            this.emit('stuck');
            this.reconnect();
        }
    }

    processParsingError(error){
        this.emit('parsingError', error)
    }


};
