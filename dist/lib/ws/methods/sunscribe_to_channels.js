module.exports = function subscribeToChannel([currentChannel, ...otherChanmodule, exports = function subscribeToChannel([currentChannel, ...otherChannels]) {
    return new Promise((resolve) => setTimeout(() => {
        this.send(currentChannel);
        otherChannels.length == 0
            ? resolve()
            : subscribeToChannel.call(this, otherChannels);
    }));
}]) {
};
