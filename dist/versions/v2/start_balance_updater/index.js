module.exports = function () {
    this._startBalanceValidator();
    this.ws.on(ESocketEvent.BalanceUpdate, (newBalance) => {
        if (newBalance === 0) {
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
