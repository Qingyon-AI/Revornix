import { API_PREFIX } from "@/config/api"

export default {
    searchNotificationRecords: API_PREFIX + '/notification/record/search',
    readNotificationRecord: API_PREFIX + '/notification/record/read',
    deleteNotificationRecords: API_PREFIX + '/notification/record/delete',
    unReadNotificationRecord: API_PREFIX + '/notification/record/unread',
    readAllNotificationRecords: API_PREFIX + '/notification/record/read-all',
    getNotificationRecordDetail: API_PREFIX + '/notification/record/detail',
    getNotificationSourceDetail: API_PREFIX + '/notification/source/detail',
    getMineNotificationSources: API_PREFIX + '/notification/source/mine',
    addNotificationSource: API_PREFIX + '/notification/source/add',
    updateNotificationSource: API_PREFIX + '/notification/source/update',
    deleteNotificationSource: API_PREFIX + '/notification/source/delete',
    getNotificationTargetDetail: API_PREFIX + '/notification/target/detail',
    getMineNotificationTargets: API_PREFIX + '/notification/target/mine',
    addNotificationTarget: API_PREFIX + '/notification/target/add',
    updateNotificationTarget: API_PREFIX + '/notification/target/update',
    deleteNotificationTarget: API_PREFIX + '/notification/target/delete',
    getMineNotificationTask: API_PREFIX + '/notification/task/mine',
    addNotificationTask: API_PREFIX + '/notification/task/add',
    updateNotificationTask: API_PREFIX + '/notification/task/update',
    deleteNotificationTask: API_PREFIX + '/notification/task/delete',
    getNotificationTaskDetail: API_PREFIX + '/notification/task/detail',
    getNotificationTemplate: API_PREFIX + '/notification/template/all',
} 