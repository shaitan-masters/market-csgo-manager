const getItemIds = require('./get_item_ids');
module.exports = async function (mhn, maxPrice) {
    let allowedPrice = maxPrice ? this._config.preparePrice(maxPrice) : Number.MAX_VALUE;
    function extractOffers(items) {
        return items.map((item) => {
            let ids = MarketApi.getItemIds(item);
            return {
                hashName: MarketApi.getItemHash(item),
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
    let itemVariants = await this.marketAPIProvider.v2.searchItemByHashName(mhn);
    if (!itemVariants.success) {
        throw MiddlewareError("Can't get item variants on TM", EErrorType.RequestFailed, EErrorSource.Market);
    }
    if (!itemVariants.data || itemVariants.data.length === 0) {
        throw MiddlewareError("Got empty list of item variants on TM", EErrorType.NotFound, EErrorSource.Market);
    }
    let rawVariants = extractOffers(itemVariants.data);
    let preparedVariants = prepareOffers(rawVariants);
    if (preparedVariants.length === 0) {
        let message = "There are variants, but all of them are too expensive or invalid";
        let lowestPrice = Math.min.apply(null, rawVariants.map((item) => item.price));
        throw MiddlewareError(message, EErrorType.TooHighPrices, EErrorSource.Owner, { lowestPrice });
    }
    return preparedVariants;
};
