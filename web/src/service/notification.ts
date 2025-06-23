import notificationApi from '@/api/notification'
import { NormalResponse, DeleteNotificationRequest, InifiniteScrollPagnitionNotification, Notification, NotificationDetailRequest, ReadNotificationRequest, SearchNotificationRequest, AddEmailSourceRequest, DeleteEmailSourceRequest, UpdateEmailSourceNotificationSourceEmailUpdatePostRequest, UpdateNotificationEmailSourceRequest } from '@/generated';
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

export const addNotificationEmailSource = async (data: AddEmailSourceRequest): Promise<NormalResponse> => {
    return await request(notificationApi.addNotificationEmailSource, {
        data
    })
}

export const deleteNotificationEmailSource = async (data: DeleteEmailSourceRequest): Promise<NormalResponse> => {
    return await request(notificationApi.deleteNotificationEmailSource, {
        data
    })
}

export const getMineNotificationEmailSource = async (): Promise<NormalResponse> => {
    return await request(notificationApi.getMineNotificationEmailSource)
}

export const updateNotificationEmailSource = async (data: UpdateNotificationEmailSourceRequest): Promise<NormalResponse> => {
    return await request(notificationApi.updateNotificationEmailSource, {
        data
    })
}