"use strict";

const MarketManager = require("./MarketManager");

// todo

function setWsEvents() {
    ws.on("balance", (newBalance) => {
        //console.log("balance", newBalance);

        self.emit("balance", newBalance);
    });
}
