const INIT_OPTIONS_VALIDATION_SCHEMA = require("../../enums/validation_schemas/init_options_validation_schema");
const VALIDATE_WITH_JOI = require("@validateWithJoi");

module.exports = (initOptions) => {
  const SCHEMA = { INIT_OPTIONS_VALIDATION_SCHEMA };
  VALIDATE_WITH_JOI(
    initOptions,
    INIT_OPTIONS_VALIDATION_SCHEMA,
   const INIT_OPTIONS_VALIDATION_SCHEMA = require("../../enums/validation_schemas/init_options_validation_schema");
const VALIDATE_WITH_JOI = require("@validateWithJoi");

module.exports = (initOptions) => {
  const SCHEMA = { INIT_OPTIONS_VALIDATION_SCHEMA };
  VALIDATE_WITH_JOI(
    initOptions,
    INIT_OPTIONS_VALIDATION_SCHEMA,
    "clientErrorsEmitter"
  );
};
