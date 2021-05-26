module.exports = async function (offers, tradeData) {
    let goodOffers = this.badOffersCache.offers.filter((el) => !el.isBad);
    let otherOffers = this.badOffersCache.offers.filter((el) => el.isBad);
    try {
        let bought = await this.layer.buyCheapest(goodOffers, tradeData);
        this._badOffers.storeBoughtOffer(bought);
        return bought;
    }
    catch (e) {
        if (otherOffers.length && e instanceof MiddlewareError && e.source !== EErrorSource.User) {
            return await this.layer.buyCheapest(otherOffers, tradeData);
        }
        throw e;
    }
};
