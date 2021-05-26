module.exports = () => { };
const RESPONSE_ENUMS = require("market-csgo-manager-master/ws/enums/incoming_messages");
module.exports = function (message) {
    const SERVICE_MESSAGES_CALLBACKS = {
        'auth': this.marketAPIProvider.v2.getWsAuth
    };
    if (SERVICE_MESSAGES_CALLBACKS[message])
        return SERVICE_MESSAGES_CALLBACKS[message]();
    try {
        const parsedMessage;
    }
    finally {
    }
};
