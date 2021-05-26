/**
 * Allows to call Manager.v2.someMethod()
 * @returns  {Object} with async functions as values methodName: function
 */
module.exports = function () {
    return {
        /**
         *
         * @param hashName
         * @param goodPrice
         * @param partnerId
         * @param tradeToken
         * @returns {Promise<any>}
         */
        buy: function (hashName, goodPrice, partnerId, tradeToken) {
            let tradeData;
            if (typeof partnerId === "object" && !tradeToken) {
                tradeData = partnerId;
            }
            else {
                tradeData = this.layer.tradeData(partnerId, tradeToken);
            }
            return this.marketAPIProvider.v2
                .getItemOffers(hashName, goodPrice)
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
                if (this._config.safeBuyRequests && err.statusCode && UNSAFE_HTTP_CODES.includes(err.statusCode)) {
                    return this.layer.getBoughtItems(new Date(), 20 * 1000).then((items) => {
                        // todo
                        console.log("TODO: add safeBuyRequests code", err.statusCode, items, err.instance);
                        let boughtItem = items.filter((item) => {
                            return 0;
                        });
                    }).catch((err2) => {
                        throw err;
                    });
                }
                if (err instanceof MiddlewareError && err.type === EErrorType.NeedMoney) {
                    this.emit(EManagerEvent.NeedMoney, err.needMoney);
                }
                throw err;
            }).bind(this);
        }
    };
};
