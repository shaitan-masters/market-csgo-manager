const getItemOffers = require('./helpers/get_item_offers');
/**
 *
 * @param {string} hashName
 * @param {number} goodPrice
 * @param {number} partnerId
 * @param {string} tradeToken
 * @returns {Promise<any>}
 */
module.exports = function (hashName: string, goodPrice: number, partnerId: number | object, tradeToken: string) {
    let tradeData = (typeof partnerId === "object" && !tradeToken) ?
        partnerId :
        {
            partnerId: partnerId,
            tradeToken: tradeToken,
        };

    return getItemOffers.call(this, hashName, goodPrice)
        .then((offers) => {
            if (this._config.avoidBadBots) {
                return this._buyAndAvoid(offers, tradeData);
            }

            return this.layer.buyCheapest(offers, tradeData);
        })
        .then((item) => {
            this._changeBalance(-item.price);

            return item;
        })
        .catch((err) => {
            // todo: Если получили в ответ http ошибку, то проверять по истории операций, что предмет не был куплен

        })
}
