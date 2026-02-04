import notificationApi from '@/api/notification'
import { NormalResponse, DeleteNotificationRecordRequest, InifiniteScrollPagnitionNotificationRecord, NotificationRecordDetailRequest, ReadNotificationRecordRequest, SearchNotificationRecordRequest, AddNotificationSourceRequest, UpdateNotificationSourceRequest, AddNotificationTargetRequest, UpdateNotificationTargetRequest, AddNotificationTaskRequest, DeleteNotificationTaskRequest, UpdateNotificationTaskRequest, NotificationTask, NotificationTaskDetailRequest, NotificationTemplatesResponse, PaginationNotificationTask, PageableRequest, TriggerEventsResponse, GetNotificationSourceRelatedTaskResponse, GetNotificationTargetRelatedTaskResponse, GetNotificationTargetRelatedTaskRequest, GetNotificationSourceRelatedTaskRequest, SearchNotificationSourceRequest, InifiniteScrollPagnitionNotificationSource, NotificationSourceForkRequest, NotificationTargetForkRequest, DeleteNotificationSourceRequest, NotificationSourceDetailRequest, NotificationSourceDetail, DeleteNotificationTargetRequest, NotificationTargetDetailRequest, SearchNotificationTargetRequest, InifiniteScrollPagnitionNotificationTarget, NotificationTargetsProvidedResponse, NotificationSourcesProvidedResponse, NotificationTargetDetail, NotificationSourcesUsableResponse, NotificationTargetsUsableResponse } from '@/generated';
import { request } from '@/lib/request';

export const forkNotificationSource = async (data: NotificationSourceForkRequest): Promise<NormalResponse> => {
    return await request(notificationApi.forkNotificationSource, {
        data
    })
}

export const forkNotificationTarget = async (data: NotificationTargetForkRequest): Promise<NormalResponse> => {
    return await request(notificationApi.forkNotificationTarget, {
        data
    })
}

export const getNotificationSourceRelatedTasks = async (data: GetNotificationSourceRelatedTaskRequest): Promise<GetNotificationSourceRelatedTaskResponse> => {
    return await request(notificationApi.getNotificationSourceRelatedTasks, {
        data
    })
}

export const getNotificationTargetRelatedTasks = async (data: GetNotificationTargetRelatedTaskRequest): Promise<GetNotificationTargetRelatedTaskResponse> => {
    return await request(notificationApi.getNotificationTargetRelatedTasks, {
        data
    })
}

export const getTriggerEvents = async (): Promise<TriggerEventsResponse> => {
    return await request(notificationApi.getTriggerEvents)
}

export const getProvidedNotificationSources = async (): Promise<NotificationSourcesProvidedResponse> => {
    return await request(notificationApi.getProvidedNotificationSources)
}

export const getProvidedNotificationTargets = async (): Promise<NotificationTargetsProvidedResponse> => {
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

export const getMineNotificationSources = async (data: SearchNotificationSourceRequest): Promise<InifiniteScrollPagnitionNotificationSource> => {
    return await request(notificationApi.getMineNotificationSources, {
        data
    })
}

export const getUsableNotificationSources = async (): Promise<NotificationSourcesUsableResponse> => {
    return await request(notificationApi.getUsableNotificationSources)
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

export const deleteNotificationTarget = async (data: DeleteNotificationTargetRequest): Promise<NormalResponse> => {
    return await request(notificationApi.deleteNotificationTarget, {
        data
    })
}

export const getMineNotificationTargetDetail = async (data: NotificationTargetDetailRequest): Promise<NotificationTargetDetail> => {
    return await request(notificationApi.getNotificationTargetDetail, {
        data
    })
}

export const getMineNotificationTargets = async (data: SearchNotificationTargetRequest): Promise<InifiniteScrollPagnitionNotificationTarget> => {
    return await request(notificationApi.getMineNotificationTargets, {
        data
    })
}

export const getUsableNotificationTargets = async (): Promise<NotificationTargetsUsableResponse> => {
    return await request(notificationApi.getUsableNotificationTargets)
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