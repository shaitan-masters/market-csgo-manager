/**
 *
 * @param partnerId
 * @param tradeToken
 * @returns {{tradeToken: any, partnerId: any}}
 * Formats trade data
 */
module.exports = function (partnerId, tradeToken) {
    return (partnerId && tradeToken) ? {
        partnerId: partnerId,
        tradeToken: tradeToken,

    } : null;
};
