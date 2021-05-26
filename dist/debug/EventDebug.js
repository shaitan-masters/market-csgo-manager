"use strict";
const chalk = require("chalk");
const pretty = require("prettyjson");
let start = null;
module.exports = function (emitter, type, displayData = false, except = [], only = []) {
    let emit = emitter && emitter.emit;
    if (typeof emit !== "function") {
        return;
    }
    let tag = type || emitter.constructor.name;
    emitter.emit = function (event) {
        if (except.includes(event)) {
            return;
        }
        if (only.length > 0 && !only.includes(event)) {
            return;
        }
        let end = Date.now();
        let diff = start === null ? 0 : end - start;
        start = end;
        console.error(chalk.yellow(tag + ":"), chalk.white(event), chalk.magenta("+" + diff + "ms"));
        if (displayData) {
            let args = Array.prototype.slice.call(arguments, 1);
            if (args.length) {
                let data = args.length === 1 ? args[0] : args;
                console.error(pretty.render(data, {
                    dashColor: "yellow",
                    stringColor: "gray",
                    numberColor: "cyan",
                }, 2));
            }
        }
        return emit.apply(this, arguments);
    };
};
