module.exports = function(balance: number) {
    if(this.wallet === balance) {
        return;
    }

    let delta = null;
    if(this.wallet !== null) {
        delta = this.wallet - balance;
    }

    this.wallet = balance;

    this.emit('balanceUpdate', this.wallet, delta);
};
