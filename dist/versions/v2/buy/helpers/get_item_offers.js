const getItemIds = require('./helpers/get_item_ids');
module.exports = async function (mhn, maxPrice) {
    let allowedPrice = maxPrice ? this._config.preparePrice(maxPrice) : Number.MAX_VALUE;
    function extractOffers(items) {
        return items.map((item) => {
            let ids = this.marketAPIProvider[this.version].getItemIds(item);
            return {
                hashName: this.marketAPIProvider[this.version].getItemHash(item),
                instanceId: ids.instanceId,
                classId: ids.classId,
                price: Number(item.price),
                offers: Number(item.offers || item.count),
            };
        });
    }
    function prepareOffers(items) {
        return items
            .filter((item) => item.price <= allowedPrice && item.offers > 0) // remove all expensive and empty offers
            .filter((item) => item.hashName === mhn) // remove all offers with the wrong items (yes, that happens)
            .sort((a, b) => a.price - b.price); // sort offers from cheapest to most expensive
    }
};
