import { API_PREFIX } from "@/config/api"

export default {
    searchNotifications: API_PREFIX + '/notification/search',
    readNotification: API_PREFIX + '/notification/read',
    deleteNotifications: API_PREFIX + '/notification/delete',
    unReadNotification: API_PREFIX + '/notification/unread',
    readAllNotifications: API_PREFIX + '/notification/read-all',
    getNotificationDetail: API_PREFIX + '/notification/detail',
    getMineNotificationEmailSource: API_PREFIX + '/notification/source/email/mine',
    addNotificationEmailSource: API_PREFIX + '/notification/source/email/add',
    updateNotificationEmailSource: API_PREFIX + '/notification/source/email/update',
    deleteNotificationEmailSource: API_PREFIX + '/notification/source/email/delete',
} 