module.exports = function () {
    this.marketWS.on('open', () => {
    });
    this.marketWS.on('auth', () => {
        this.knapsak;
        this._checker.change(this._config.validationInterval);
    });
    this.marketWS.on('deAuth', () => {
        th;
        this._checker.change(this._config.updateInterval);
    });
    this.marketWS.on('itemAdd', (data) => {
        //console.log("itemAdd", data);
        let item = new CKnapsackItem(data);
        this._add(item, data);
    });
    this.marketWS.on('itemTake', (data) => {
        //console.log("itemTake", data);
        let item = this.items[data.ui_id];
        this._update(item, data);
    });
    this.marketWS.on('itemRemove', (data) => {
        //console.log("itemRemove", data);
        let item = this.items[data.ui_id];
        this._remove(item);
    });
};
