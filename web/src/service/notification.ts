import notificationApi from '@/api/notification'
import { NormalResponse, DeleteNotificationRecordRequest, InifiniteScrollPagnitionNotificationRecord, NotificationRecordDetailRequest, ReadNotificationRecordRequest, SearchNotificationRecordRequest, AddNotificationSourceRequest, DeleteUserNotificationSourceRequest, UpdateNotificationSourceRequest, NotificationSourcesResponse, NotificationSource, UserNotificationSourceDetailRequest, AddNotificationTargetRequest, DeleteUserNotificationTargetRequest, UserNotificationTargetDetailRequest, UpdateNotificationTargetRequest, NotificationTarget, AddNotificationTaskRequest, DeleteNotificationTaskRequest, UpdateNotificationTaskRequest, NotificationTask, NotificationTaskDetailRequest, NotificationTemplatesResponse, NotificationTargetsResponse, PaginationNotificationTask, PageableRequest, UserNotificationSourcesResponse, UserNotificationTargetsResponse, UserNotificationSource, UserNotificationTarget } from '@/generated';
import { request } from '@/lib/request';

export const getProvidedNotificationSources = async (): Promise<NotificationSourcesResponse> => {
    return await request(notificationApi.getProvidedNotificationSources)
}

export const getProvidedNotificationTargets = async (): Promise<NotificationTargetsResponse> => {
    return await request(notificationApi.getProvidedNotificationTargets)
}

export const deleteNotificationRecords = async (data: DeleteNotificationRecordRequest): Promise<NormalResponse> => {
    return await request(notificationApi.deleteNotificationRecords, {
        data
    })
}

export const searchNotificationRecords = async (data: SearchNotificationRecordRequest): Promise<InifiniteScrollPagnitionNotificationRecord> => {
    return await request(notificationApi.searchNotificationRecords, {
        data
    })
}

export const readNotificationRecords = async (data: ReadNotificationRecordRequest): Promise<NormalResponse> => {
    return await request(notificationApi.readNotificationRecord, {
        data
    })
}

export const getNotificationRecordDetail = async (data: NotificationRecordDetailRequest): Promise<Notification> => {
    return await request(notificationApi.getNotificationRecordDetail, {
        data
    })
}

export const readAllNotificationRecords = async (): Promise<NormalResponse> => {
    return await request(notificationApi.readAllNotificationRecords)
}

export const addNotificationSource = async (data: AddNotificationSourceRequest): Promise<NormalResponse> => {
    return await request(notificationApi.addNotificationSource, {
        data
    })
}

export const deleteNotificationSource = async (data: DeleteUserNotificationSourceRequest): Promise<NormalResponse> => {
    return await request(notificationApi.deleteNotificationSource, {
        data
    })
}

export const getMineNotificationSourceDetail = async (data: UserNotificationSourceDetailRequest): Promise<UserNotificationSource> => {
    return await request(notificationApi.getNotificationSourceDetail, {
        data
    })
}

export const getMineNotificationSources = async (): Promise<UserNotificationSourcesResponse> => {
    return await request(notificationApi.getMineNotificationSources)
}

export const updateNotificationSource = async (data: UpdateNotificationSourceRequest): Promise<NormalResponse> => {
    return await request(notificationApi.updateNotificationSource, {
        data
    })
}

export const addNotificationTarget = async (data: AddNotificationTargetRequest): Promise<NormalResponse> => {
    return await request(notificationApi.addNotificationTarget, {
        data
    })
}

export const deleteNotificationTarget = async (data: DeleteUserNotificationTargetRequest): Promise<NormalResponse> => {
    return await request(notificationApi.deleteNotificationTarget, {
        data
    })
}

export const getMineNotificationTargetDetail = async (data: UserNotificationTargetDetailRequest): Promise<UserNotificationTarget> => {
    return await request(notificationApi.getNotificationTargetDetail, {
        data
    })
}

export const getMineNotificationTargets = async (): Promise<UserNotificationTargetsResponse> => {
    return await request(notificationApi.getMineNotificationTargets)
}

export const updateNotificationTarget = async (data: UpdateNotificationTargetRequest): Promise<NormalResponse> => {
    return await request(notificationApi.updateNotificationTarget, {
        data
    })
}

export const addNotificationTask = async (data: AddNotificationTaskRequest): Promise<NormalResponse> => {
    return await request(notificationApi.addNotificationTask, {
        data
    })
}

export const deleteNotificationTask = async (data: DeleteNotificationTaskRequest): Promise<NormalResponse> => {
    return await request(notificationApi.deleteNotificationTask, {
        data
    })
}

export const updateNotificationTask = async (data: UpdateNotificationTaskRequest): Promise<NormalResponse> => {
    return await request(notificationApi.updateNotificationTask, {
        data
    })
}

export const getMineNotificationTask = async (data: PageableRequest): Promise<PaginationNotificationTask> => {
    return await request(notificationApi.getMineNotificationTask, {
        data
    })
}

export const getNotificationTaskDetail = async (data: NotificationTaskDetailRequest): Promise<NotificationTask> => {
    return await request(notificationApi.getNotificationTaskDetail, {
        data
    })
}

export const getNotificationTemplate = async (): Promise<NotificationTemplatesResponse> => {
    return await request(notificationApi.getNotificationTemplate)
}