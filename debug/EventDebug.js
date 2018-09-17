"use strict";

const chalk = require("chalk");
const pretty = require("prettyjson");

let start = null;

module.exports = function(emitter, type, displayData = false, except = []) {
    let emit = emitter && emitter.emit;
    if(typeof emit !== "function") {
        return;
    }

    let tag = type || emitter.constructor.name;

    emitter.emit = function(event) {
        if(except.includes(event)) {
            return;
        }

        let end = Date.now();
        let diff = start === null ? 0 : end - start;

        start = end;

        console.error(
            chalk.yellow(tag + ":"),
            chalk.white(event),
            chalk.magenta("+" + diff + "ms")
        );
        if(displayData) {
            let args = Array.prototype.slice.call(arguments, 1);

            if(args.length) {
                console.error(pretty.render(args[0], {
                    dashColor: "yellow",
                    stringColor: "gray",
                    numberColor: "cyan",
                }, 2));
            }
        }

        return emit.apply(this, arguments);
    };
};
