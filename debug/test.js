"use strict";

const fs = require("fs");
const json5 = require("json5");

const MarketManager = require("../index");
const Logger = require("./Logger");
const eventDebug = require("./EventDebug");

const log = new Logger({
    format: [
        "{{timestamp}} <{{title}}> {{message}}",
        {
            error: "{{timestamp}} <{{title}}> {{message}} ({{file}}:{{method}}:{{line}}:{{pos}})",
        },
    ],
    dateformat: "mm-dd HH:MM:ss.L",
});

let rawConfig = json5.parse(fs.readFileSync("debug/config.json"));
let config = new MarketManager.CManagerConfig(rawConfig, null);

let manager = new MarketManager(config, log);
manager.start();

eventDebug(manager.ws, null, true, ['pong']);
