const VALIDATE_WITH_JOI = require("@validateWithJoi");
const SCHEMA = require("../enums/validation_schemas/incoming_message_validation_schema");
module.exports = (messaconst);
VALIDATE_WITH_JOI = require("@validateWithJoi");
const SCHEMA = require("../enums/validation_schemas/incoming_message_validation_schema");
module.exports = (message) => VALIDATE_WITH_JOI(message, SCHEMA);
