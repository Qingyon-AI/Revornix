import notificationApi from '@/api/notification'
import { NormalResponse, DeleteNotificationRecordRequest, InifiniteScrollPagnitionNotificationRecord, NotificationRecordDetailRequest, ReadNotificationRecordRequest, SearchNotificationRecordRequest, AddNotificationSourceRequest, DeleteNotificationSourceRequest, UpdateNotificationSourceRequest, NotificationSourcesResponse, NotificationSourceDetail, NotificationSourceDetailRequest } from '@/generated';
import { request } from '@/lib/request';

export const deleteNotifications = async (data: DeleteNotificationRecordRequest): Promise<NormalResponse> => {
    return await request(notificationApi.deleteNotifications, {
        data
    })
}

export const searchNotifications = async (data: SearchNotificationRecordRequest): Promise<InifiniteScrollPagnitionNotificationRecord> => {
    return await request(notificationApi.searchNotifications, {
        data
    })
}

export const readNotifications = async (data: ReadNotificationRecordRequest): Promise<NormalResponse> => {
    return await request(notificationApi.readNotification, {
        data
    })
}

export const getNotificationDetail = async (data: NotificationRecordDetailRequest): Promise<Notification> => {
    return await request(notificationApi.getNotificationDetail, {
        data
    })
}

export const readAllNotifications = async (): Promise<NormalResponse> => {
    return await request(notificationApi.readAllNotifications)
}

export const addNotificationSource = async (data: AddNotificationSourceRequest): Promise<NormalResponse> => {
    return await request(notificationApi.addNotificationSource, {
        data
    })
}

export const deleteNotificationSource = async (data: DeleteNotificationSourceRequest): Promise<NormalResponse> => {
    return await request(notificationApi.deleteNotificationSource, {
        data
    })
}

export const getMineNotificationSourceDetail = async (data: NotificationSourceDetailRequest): Promise<NotificationSourceDetail> => {
    return await request(notificationApi.getNotificationSourceDetail, {
        data
    })
}

export const getMineNotificationSources = async (): Promise<NotificationSourcesResponse> => {
    return await request(notificationApi.getMineNotificationSources)
}

export const updateNotificationSource = async (data: UpdateNotificationSourceRequest): Promise<NormalResponse> => {
    return await request(notificationApi.updateNotificationSource, {
        data
    })
}