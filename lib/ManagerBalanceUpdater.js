"use strict";

const MarketManager = require("./MarketManager");
const EManagerEvent = require("./enums/EManagerEvent");
const ESocketEvent = require("../market/enums/ESocketEvent");

const ChangeableInterval = require("../modules/ChangeableInterval");

MarketManager.prototype.getBalance = function() {
    return this._wallet;
};

MarketManager.prototype._startBalanceUpdater = function() {
    this._startBalanceValidator();

    this.ws.on(ESocketEvent.BalanceUpdate, (newBalance) => {
        if(newBalance === 0) {
            // This probably is a bug рфззутув
            this._validateBalance();

            return;
        }

        this._setNewBalance(newBalance);
    });

    // Handling new balance
    this.on(EManagerEvent.BalanceUpdate, (newBalance) => {
        this.layer.setAccountBalance(newBalance);
    });
};

MarketManager.prototype._startBalanceValidator = function() {
    let maxUpdate = this._config.balanceValidationInterval;
    let minUpdate = maxUpdate / 10;

    let updateCall = () => this._validateBalance();
    let getIntervalTime = () => this.ws.isConnected() ? maxUpdate : minUpdate;

    this.__walletUpdateInterval = new ChangeableInterval(updateCall, getIntervalTime());
    this.__walletUpdateInterval.execute();

    this.ws.on(ESocketEvent.DeAuth, () => {
        this.__walletUpdateInterval.change(minUpdate);
    });
    this.ws.on(ESocketEvent.Auth, () => {
        this.__walletUpdateInterval.change(maxUpdate);
    });
};

MarketManager.prototype._validateBalance = function() {
    this.layer.getBalance().then((balance) => {
        this._setNewBalance(balance);
    }).catch((err) => this._logger.error(err));
};

MarketManager.prototype._changeBalance = function(delta, explicit = false) {
    if(explicit || !this.ws.isConnected()) {
        this._wallet += delta;

        this.emit(EManagerEvent.BalanceUpdate, this._wallet, delta);
    }
};

MarketManager.prototype._setNewBalance = function(balance) {
    if(this._wallet !== balance) {
        let delta = null;
        if(this._wallet !== null) {
            delta = this._wallet - balance;
        }

        this._wallet = balance;

        this.emit(EManagerEvent.BalanceUpdate, this._wallet, delta);
    }
};
