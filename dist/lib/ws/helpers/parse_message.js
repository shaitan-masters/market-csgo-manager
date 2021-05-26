module.exports = function (message) {
    try {
        return JSON.parse(message);
    }
    catch (error) {
        this.processParsingError(error);
    }
};
