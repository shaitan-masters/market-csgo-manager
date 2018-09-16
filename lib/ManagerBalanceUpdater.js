"use strict";

const MarketManager = require("./MarketManager");

// todo

MarketManager.prototype._startBalanceUpdater = function() {
    //FnExtensions.setWatcher(this.requestBalanceUpdate, this._config.balanceValidationInterval, this);

    ws.on("balance", (newBalance) => {
        //console.log("balance", newBalance);

        self.emit("balance", newBalance);
    });

    this.on("balance", (newBalance) => {
        this.layer.setAccountBalance(newBalance);
    });
};

function setWsEvents() {
    ws.on("balance", (newBalance) => {
        //console.log("balance", newBalance);

        self.emit("balance", newBalance);
    });
}
