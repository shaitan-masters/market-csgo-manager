module.exports = function (eventName, eventData) {
    const EMITTER_DATA = {
        'ws_stuck': {
            message: 'Websocket stuck'
        }
    };
    return this.emit(eventName, {
        ...eventData,
        ...EMITTER_DATA[eventName]
    });
};
