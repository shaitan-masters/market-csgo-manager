module.exports = function (delta, explicit = false) {
    if (explicit || !this.marketWS.isConnected) {
        this.wallet += delta;
        this.emit('balanceUpdate', this.wallet, delta);
    }
};
