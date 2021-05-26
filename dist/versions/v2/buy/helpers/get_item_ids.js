/**
 * Formal way to get steam item ids
 *
 * @param {Object} item Item object that you got from API, or you have created by yourself
 * @param {Boolean} [asNumbers] Should we convert ids to numbers?
 *
 * @returns {{classId: string, instanceId: string}}
 */
module.exports = function (item, asNumbers = false) {
    const CLASS_ID = item.i_classid || item.classid || item.classId || item.class;
    let instanceId = item.i_instanceid || item.instanceid || item.instanceId || item.instance || 0;
    if (instanceId === 0 && item.ui_real_instance) {
        instanceId = item.ui_real_instance;
    }
    return {
        classId: (asNumbers ? Number : String)(CLASS_ID),
        instanceId: (asNumbers ? Number : String)(instanceId),
    };
};
