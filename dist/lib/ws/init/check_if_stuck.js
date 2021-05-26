// @ts-ignore
const CONFIG = require('config').get('ws');
module.exports = function () {
    clearInterval(this.stuckDetectionInterval);
    // @ts-ignore
    const stuckDetectTime = CONFIG.stuck_detect_time;
    this.stuckDetectionInterval = setInterval(() => {
        if (this.stuckCheckTime + stuckDetectTime - Date.now() < 0) {
            this.processStuckStatus(true);
        }
        else {
            this.stuckCheckTime = Date.now();
        }
    }, stuckDetectTime);
};
