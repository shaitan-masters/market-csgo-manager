"use strict";

const MarketManager = require("./MarketManager");
const ESocketEvent = require("../market/enums/system/ESocketEvent");

MarketManager.prototype._startBalanceUpdater = function() {
    //FnExtensions.setWatcher(this.requestBalanceUpdate, this._config.balanceValidationInterval, this);
    this.ws.on(ESocketEvent.DeAuth, () => {
        // todo
    });
    this.ws.on(ESocketEvent.Auth, () => {
        // todo
    });

    this.ws.on(ESocketEvent.BalanceUpdate, (newBalance) => {
        this._setNewBalance(newBalance);
    });

    // Handling new balance
    this.on("balance", (newBalance) => {
        this.layer.setAccountBalance(newBalance);
    });
};

MarketManager.prototype._validateBalance = function() {
    this.layer.getBalance().then((balance) => {
        this._setNewBalance(balance);
    }).catch((err) => this._logger.error(err));
};

MarketManager.prototype._setNewBalance = function(balance) {
    if(this._wallet !== balance) {
        let delta = null;
        if(this._wallet !== null) {
            delta = this._wallet - balance;
        }

        this._wallet = balance;

        this.emit("balance", this._wallet, delta);
    }
};
