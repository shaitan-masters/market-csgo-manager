"use strict";

const MarketManager = require("./MarketManager");
const EManagerEvent = require("./enums/EManagerEvent");
const ESocketEvent = require("../market/enums/ESocketEvent");

const ChangeableInterval = require("../modules/ChangeableInterval");

/**
 * @memberof MarketManager
 */
MarketManager.prototype.getBalance = function() {
    return this._wallet;
};

/**
 * @memberof MarketManager
 */
MarketManager.prototype.getCurrency = function() {
    return this._currency;
};

/**
 * @memberof MarketManager
 */
MarketManager.prototype._startBalanceUpdater = function() {
    this._startBalanceValidator();

    this.ws.on(ESocketEvent.BalanceUpdate, (newBalance) => {
        if(newBalance === 0) {
            // Here probably a bug happened
            return this.updateWallet().catch(e => this._log.error(e));
        }

        this._setNewBalance(newBalance);
    });

    // Handling new balance
    this.on(EManagerEvent.BalanceUpdate, (newBalance) => {
        this.layer.setAccountBalance(newBalance);
    });
};

/**
 * @memberof MarketManager
 */
MarketManager.prototype._startBalanceValidator = function() {
    let maxUpdate = this._config.balanceValidationInterval;
    let minUpdate = maxUpdate / 10;

    let updateCall = () => this.updateWallet();
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

/**
 * @memberof MarketManager
 */
MarketManager.prototype.updateWallet = async function() {
    try {
        const data = await this.layer.getBalance();
        const walletCents = Math.trunc(data.money * 100);

        this._currency = data.currency;
        this._setNewBalance(walletCents);
    } catch(e) {
        this._log.error("Error occurred on getBalance: ", e);
    }
};

/**
 * @memberof MarketManager
 */
MarketManager.prototype._changeBalance = function(delta, explicit = false) {
    if(explicit || !this.ws.isConnected()) {
        this._wallet += delta;

        this.emit(EManagerEvent.BalanceUpdate, this._wallet, delta);
    }
};

/**
 * @memberof MarketManager
 */
MarketManager.prototype._setNewBalance = function(balance) {
    if(this._wallet === balance) {
        return;
    }

    let delta = null;
    if(this._wallet !== null) {
        delta = this._wallet - balance;
    }

    this._wallet = balance;

    this.emit(EManagerEvent.BalanceUpdate, this._wallet, delta);
};
