// @ts-ignore
const JOI = require("joi");
const WS_VALIDATION_SCHEMA = JOI.object(Object.freeze({
    messageCallback: JOI.func().minArity(1),
    channels: JOI.array().items(JOI.string().valid()),
    onOpenCallback: JOI.func().minArity(1),
    onCloseCallback: JOI.func().minArity(1),
    onErrorCallback: JOI.func().minArity(1),
}));
//Check init options
module.exports = Object.freeze(JOI.object({
    APIKey: JOI.string().alphanum(),
    v1: WS_VALIDATION_SCHEMA,
    v2: WS_VALIDATION_SCHEMA,
    marketAPIProvider: JOI.func(),
}));
