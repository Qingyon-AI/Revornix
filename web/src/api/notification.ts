import { API_PREFIX } from "@/config/api"

export default {
    searchNotifications: API_PREFIX + '/notification/search',
    readNotification: API_PREFIX + '/notification/read',
    deleteNotifications: API_PREFIX + '/notification/delete',
    unReadNotification: API_PREFIX + '/notification/unread',
    readAllNotifications: API_PREFIX + '/notification/read-all',
    getNotificationDetail: API_PREFIX + '/notification/detail',
    getNotificationSourceDetail: API_PREFIX + '/notification/source/detail',
    getMineNotificationSources: API_PREFIX + '/notification/source/mine',
    addNotificationSource: API_PREFIX + '/notification/source/add',
    updateNotificationSource: API_PREFIX + '/notification/source/update',
    deleteNotificationSource: API_PREFIX + '/notification/source/delete',
} 