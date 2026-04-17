import notificationApi from '@/api/notification'
import { NormalResponse, DeleteNotificationRecordRequest, InifiniteScrollPagnitionNotificationRecord, NotificationRecordDetailRequest, ReadNotificationRecordRequest, SearchNotificationRecordRequest, AddNotificationSourceRequest, UpdateNotificationSourceRequest, AddNotificationTargetRequest, UpdateNotificationTargetRequest, AddNotificationTaskRequest, DeleteNotificationTaskRequest, UpdateNotificationTaskRequest, NotificationTask, NotificationTaskDetailRequest, PaginationNotificationTask, PageableRequest, GetNotificationSourceRelatedTaskResponse, GetNotificationTargetRelatedTaskResponse, GetNotificationTargetRelatedTaskRequest, GetNotificationSourceRelatedTaskRequest, SearchNotificationSourceRequest, InifiniteScrollPagnitionNotificationSource, NotificationSourceForkRequest, NotificationTargetForkRequest, DeleteNotificationSourceRequest, NotificationSourceDetailRequest, NotificationSourceDetail, DeleteNotificationTargetRequest, NotificationTargetDetailRequest, SearchNotificationTargetRequest, InifiniteScrollPagnitionNotificationTarget, NotificationTargetsProvidedResponse, NotificationSourcesProvidedResponse, NotificationTargetDetail, NotificationSourcesUsableResponse, NotificationTargetsUsableResponse, EmailTargetSendCodeRequest, UserPublicInfo } from '@/generated';
import { request } from '@/lib/request';

export type NotificationTemplateParameterBinding = {
	source_type: 'event' | 'static';
	attribute_key?: string | null;
	static_value?: string | null;
};

export type NotificationTemplateParameter = {
	id: number;
	key: string;
	label: string;
	description?: string | null;
	value_type: string;
	required: boolean;
	default_value?: string | null;
};

export type NotificationTemplateItem = {
	id: number;
	uuid: string;
	creator_id: number;
	is_public: boolean;
	name: string;
	description?: string | null;
	title_template?: string | null;
	content_template?: string | null;
	link_template?: string | null;
	cover_template?: string | null;
	create_time: string;
	update_time?: string | null;
	creator: UserPublicInfo;
	is_forked?: boolean | null;
	parameters: NotificationTemplateParameter[];
};

export type TriggerEventAttribute = {
	id: number;
	key: string;
	label: string;
	label_zh?: string | null;
	description?: string | null;
	description_zh?: string | null;
	value_type: string;
	required: boolean;
};

export type TriggerEventItem = {
	id: number;
	uuid: string;
	name: string;
	name_zh: string;
	description?: string | null;
	description_zh?: string | null;
	create_time: string;
	update_time?: string | null;
	attributes: TriggerEventAttribute[];
};

export type NotificationTemplatesListResponse = {
	data: NotificationTemplateItem[];
};

export type TriggerEventsListResponse = {
	data: TriggerEventItem[];
};

export type NotificationTemplateUpsertRequest = {
	notification_template_id?: number;
	name: string;
	is_public: boolean;
	description?: string;
	title_template: string;
	content_template?: string;
	link_template?: string;
	cover_template?: string;
	parameters: Array<{
		key: string;
		label: string;
		description?: string;
		value_type: string;
		required: boolean;
		default_value?: string;
	}>;
};

export type NotificationTemplateForkRequest = {
	notification_template_id: number;
	status: boolean;
};

export type SearchNotificationTemplateRequest = {
	keyword?: string;
	start?: number;
	limit: number;
};

export type InifiniteScrollPagnitionNotificationTemplate = {
	total: number;
	start?: number | null;
	limit: number;
	has_more: boolean;
	elements: NotificationTemplateItem[];
	next_start?: number | null;
};

export type NotificationTaskPayload = Omit<AddNotificationTaskRequest, 'notification_template_id'> & {
	notification_template_id?: number;
	notification_template_bindings?: Record<string, NotificationTemplateParameterBinding>;
};

export type NotificationTaskUpdatePayload = Omit<UpdateNotificationTaskRequest, 'notification_template_id'> & {
	notification_template_id?: number;
	notification_template_bindings?: Record<string, NotificationTemplateParameterBinding>;
};

export type NotificationTaskDetailData = NotificationTask & {
	notification_template_bindings?: Record<string, NotificationTemplateParameterBinding>;
};

export const forkNotificationSource = async (data: NotificationSourceForkRequest): Promise<NormalResponse> => {
    return await request(notificationApi.forkNotificationSource, {
        data
    })
}

export const sendEmailNotificationTargetCode = async (data: EmailTargetSendCodeRequest): Promise<NormalResponse> => {
    return await request(notificationApi.sendEmailNotificationTargetCode, {
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

export const getTriggerEvents = async (): Promise<TriggerEventsListResponse> => {
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

export const addNotificationTask = async (data: NotificationTaskPayload): Promise<NormalResponse> => {
    return await request(notificationApi.addNotificationTask, {
        data
    })
}

export const deleteNotificationTask = async (data: DeleteNotificationTaskRequest): Promise<NormalResponse> => {
    return await request(notificationApi.deleteNotificationTask, {
        data
    })
}

export const updateNotificationTask = async (data: NotificationTaskUpdatePayload): Promise<NormalResponse> => {
    return await request(notificationApi.updateNotificationTask, {
        data
    })
}

export const getMineNotificationTask = async (data: PageableRequest): Promise<PaginationNotificationTask> => {
    return await request(notificationApi.getMineNotificationTask, {
        data
    })
}

export const getNotificationTaskDetail = async (data: NotificationTaskDetailRequest): Promise<NotificationTaskDetailData> => {
    return await request(notificationApi.getNotificationTaskDetail, {
        data
    })
}

export const getNotificationTemplate = async (): Promise<NotificationTemplatesListResponse> => {
    return await request(notificationApi.getNotificationTemplate)
}

export const getNotificationTemplatesCommunity = async (
	data: SearchNotificationTemplateRequest,
): Promise<InifiniteScrollPagnitionNotificationTemplate> => {
	return await request(notificationApi.getNotificationTemplatesCommunity, {
		data,
	});
};

export const upsertNotificationTemplate = async (
	data: NotificationTemplateUpsertRequest,
): Promise<NormalResponse> => {
	return await request(notificationApi.upsertNotificationTemplate, {
		data,
	});
};

export const deleteNotificationTemplate = async (data: {
	notification_template_id: number;
}): Promise<NormalResponse> => {
	return await request(notificationApi.deleteNotificationTemplate, {
		data,
	});
};

export const forkNotificationTemplate = async (
	data: NotificationTemplateForkRequest,
): Promise<NormalResponse> => {
	return await request(notificationApi.forkNotificationTemplate, {
		data,
	});
};
