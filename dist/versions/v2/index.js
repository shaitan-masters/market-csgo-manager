/**
 * Allows to call Manager.v2.someMethod()
 * @returns  {Object} with async functions as values methodName: function
 */
module.exports = function () {
    return {
        buy: require('./buy').bind(this),
        buyAndAvoid: require('./buy_and_avoid').bind(this),
        setWSCallbacks: require('./set_WS_callbacks').bind(this),
        startBalanceUpdate: require('./start_balance_updater').bind(this)
    };
};
