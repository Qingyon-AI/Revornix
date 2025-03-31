import notificationApi from '@/api/notification'
import { NormalResponse, DeleteNotificationRequest, InifiniteScrollPagnitionNotification, Notification, NotificationDetailRequest, ReadNotificationRequest, SearchNotificationRequest } from '@/generated';
import { request } from '@/lib/request';

export const deleteNotifications = async (data: DeleteNotificationRequest): Promise<NormalResponse> => {
    return await request(notificationApi.deleteNotifications, {
        data
    })
}

export const searchNotifications = async (data: SearchNotificationRequest): Promise<InifiniteScrollPagnitionNotification> => {
    return await request(notificationApi.searchNotifications, {
        data
    })
}

export const readNotifications = async (data: ReadNotificationRequest): Promise<NormalResponse> => {
    return await request(notificationApi.readNotification, {
        data
    })
}

export const getNotificationDetail = async (data: NotificationDetailRequest): Promise<Notification> => {
    return await request(notificationApi.getNotificationDetail, {
        data
    })
}

export const readAllNotifications = async (): Promise<NormalResponse> => {
    return await request(notificationApi.readAllNotifications)
}