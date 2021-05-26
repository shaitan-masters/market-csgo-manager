module.exports = function(delta: number, explicit: boolean = false) {

    if(explicit || !this.marketWS.isConnected) {
        this.wallet += delta;

        this.emit('balanceUpdate', this.wallet, delta);
    }
};
