module.exports = function (price) {
    let allowedPrice = price * (1 + this.price.fluctuation);
    let compromise = Math.max(price * this.price.compromiseFactor, this.price.minCompromise);
    let priceCap = allowedPrice + compromise;
    //console.log("allowedPrice", allowedPrice, "compromise", compromise, "max", priceCap);
    return priceCap;
};
