const EVENT_EMITTER = require("events");
//Root Error emitter
const COMMON_ERROR_EMITTER = require("./common_error_emitter");
//Get dictionary string for this error
const WS_ERRORS = require("../../../json/dictionary.json").ws_errors;
const WS_ERROR_EMITTER = new EVENT_EMITTER();
// Call root event emitter
WS_ERROR_EMITTER.on("error", (error) => COMMON_ERROR_EMITTER.emit("error", {
    name: "Client error",
    error: WS_ERRORS[error],
}));
module.exports = WS_ERROR_EMITTER;
const EVENT_EMITTER = require("events");
//Root Error emitter
const COMMON_ERROR_EMITTER = require("./common_error_emitter");
//Get dictionary string for this error
const WS_ERRORS = require("../../../json/dictionary.json").ws_errors;
const WS_ERROR_EMITTER = new EVENT_EMITTER();
// Call root event emitter
WS_ERROR_EMITTER.on("error", (error) => COMMON_ERROR_EMITTER.emit("error", {
    name: "Client error",
    error: WS_ERRORS[error],
}));
module.exports = WS_ERROR_EMITTER;
