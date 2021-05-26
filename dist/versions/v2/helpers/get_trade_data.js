module.exports = function (partnerId, tradeToken) {
    if (partnerId && tradeToken) {
        return {
            partnerId: partnerId,
            tradeToken: tradeToken,
        };
    }
    return null;
};
