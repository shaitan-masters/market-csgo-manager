/**
 * Allows to call Manager.v2.someMethod()
 * @returns  {Object} with async functions as values methodName: function
 */
module.exports = function () {
    return {
        buy: require('src/versions/v2/buy/buy').bind(this)
    };
};
