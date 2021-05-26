module.exports = function subscribeToChannels(channels: string[]) {
   const {length} = channels;
   this.WSClient.send(channels[0]);
   return length ? subscribeToChannels(channels.slice(1)) : true;
};
