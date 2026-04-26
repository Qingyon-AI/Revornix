import adminApi from '@/api/admin';
import type {
	DocumentDetailResponse,
	GenericFileSystemUploadResponse,
	NormalResponse,
	NotificationSourcesUsableResponse,
	NotificationTargetsUsableResponse,
	NotificationTask,
	PaginationNotificationTask,
	TriggerEventsResponse,
	NotificationTemplatesResponse,
	InifiniteScrollPagnitionNotificationSource,
	InifiniteScrollPagnitionNotificationTarget,
	NotificationSource,
	NotificationTarget,
	SectionInfo,
} from '@/generated';
import type { PaginationData } from '@/schemas/pagination';
import { request } from '@/lib/request';

export type AdminUserSummary = {
	id: number;
	uuid: string;
	role: number;
	avatar: string;
	nickname: string;
	slogan?: string | null;
	email?: string | null;
	phone?: string | null;
	is_forbidden: boolean;
	fans: number;
	follows: number;
	create_time: string;
	update_time?: string | null;
};

export type AdminUserDetail = AdminUserSummary & {
	default_user_file_system?: number | null;
	default_read_mark_reason?: number | null;
	default_document_reader_model_id?: number | null;
	default_revornix_model_id?: number | null;
	default_file_document_parse_user_engine_id?: number | null;
	default_website_document_parse_user_engine_id?: number | null;
	default_podcast_user_engine_id?: number | null;
	default_audio_transcribe_engine_id?: number | null;
	default_image_generate_engine_id?: number | null;
	default_ai_interaction_language?: number | null;
};

export type AdminUserComputeInfo = {
	available_points: number;
};

export type AdminUserComputeLedgerItem = {
	id: number;
	delta_points: number;
	balance_after: number;
	reason?: string | null;
	source?: string | null;
	create_time?: string | null;
	expire_time?: string | null;
};

export type AdminUserComputeLedgerResponse = {
	items: AdminUserComputeLedgerItem[];
	total: number;
	page: number;
	page_size: number;
	has_more: boolean;
};

export type AdminUserSearchRequest = {
	keyword?: string;
	role?: number;
	is_forbidden?: boolean;
	page_num?: number;
	page_size?: number;
};

export type AdminUserCreateRequest = {
	nickname: string;
	email: string;
	password: string;
	role: number;
	slogan?: string;
	avatar?: string;
};

export type AdminUserUpdateRequest = {
	user_id: number;
	nickname?: string;
	email?: string;
	password?: string;
	role?: number;
	slogan?: string;
	avatar?: string;
	is_forbidden?: boolean;
};

export type AdminDocumentSummary = {
	id: number;
	title: string;
	description?: string | null;
	category: number;
	from_plat: string;
	creator_id: number;
	creator_nickname: string;
	create_time: string;
	update_time?: string | null;
};

export type AdminSectionSummary = {
	id: number;
	title: string;
	description?: string | null;
	creator_id: number;
	creator_nickname: string;
	documents_count: number;
	subscribers_count: number;
	publish_uuid?: string | null;
	create_time: string;
	update_time?: string | null;
};

export type AdminAntiScrapeSummaryWindow = {
	minutes: number;
	counts: Record<string, number>;
};

export type AdminAntiScrapeEvent = {
	timestamp: string;
	event: string;
	policy: string;
	rule: string;
	method: string;
	host: string;
	path: string;
	service: string;
	clientIp: string;
	userAgentHash: string;
	limit?: number | null;
	remaining?: number | null;
	resetSeconds?: number | null;
};

export type AdminAntiScrapeStatsResponse = {
	timestamp: string;
	summary: AdminAntiScrapeSummaryWindow[];
	recentEvents: AdminAntiScrapeEvent[];
};

export const searchAdminUsers = async (
	data: AdminUserSearchRequest,
): Promise<PaginationData<AdminUserSummary>> => {
	return await request(adminApi.searchUsers, { data });
};

export const getAdminAntiScrapeStats =
	async (): Promise<AdminAntiScrapeStatsResponse> => {
		return await request(adminApi.getAntiScrapeStats, { data: {} });
	};

export const getAdminUserDetail = async (
	user_id: number,
): Promise<AdminUserDetail> => {
	return await request(adminApi.getUserDetail, {
		data: { user_id },
	});
};

export const createAdminUser = async (
	data: AdminUserCreateRequest,
): Promise<AdminUserDetail> => {
	return await request(adminApi.createUser, { data });
};

export const updateAdminUser = async (
	data: AdminUserUpdateRequest,
): Promise<NormalResponse> => {
	return await request(adminApi.updateUser, { data });
};

export const uploadAdminUserAvatar = async (data: {
	user_id: number;
	file: File;
}): Promise<GenericFileSystemUploadResponse> => {
	const formData = new FormData();
	formData.append('user_id', String(data.user_id));
	formData.append('file', data.file);
	return await request(adminApi.uploadUserAvatar, { formData });
};

export const uploadAdminUserNotificationCover = async (data: {
	user_id: number;
	file: File;
}): Promise<GenericFileSystemUploadResponse> => {
	const formData = new FormData();
	formData.append('user_id', String(data.user_id));
	formData.append('file', data.file);
	return await request(adminApi.uploadUserNotificationCover, { formData });
};

export const getAdminUserComputeInfo = async (
	user_id: number,
): Promise<AdminUserComputeInfo> => {
	return await request(adminApi.getUserComputeInfo, {
		data: { user_id },
	});
};

export const getAdminUserComputeLedger = async (data: {
	user_id: number;
	page?: number;
	page_size?: number;
	direction?: 'all' | 'income' | 'expense';
}): Promise<AdminUserComputeLedgerResponse> => {
	return await request(adminApi.getUserComputeLedger, {
		data,
	});
};

export const searchAdminUserNotificationSources = async (data: {
	user_id: number;
	keyword?: string;
	start?: number;
	limit?: number;
}): Promise<InifiniteScrollPagnitionNotificationSource> => {
	return await request(adminApi.searchUserNotificationSources, { data });
};

export const searchAdminUserNotificationTargets = async (data: {
	user_id: number;
	keyword?: string;
	start?: number;
	limit?: number;
}): Promise<InifiniteScrollPagnitionNotificationTarget> => {
	return await request(adminApi.searchUserNotificationTargets, { data });
};

export const getAdminUserUsableNotificationSources = async (
	user_id: number,
): Promise<NotificationSourcesUsableResponse> => {
	return await request(adminApi.getUserUsableNotificationSources, {
		data: { user_id },
	});
};

export const getAdminUserUsableNotificationTargets = async (
	user_id: number,
): Promise<NotificationTargetsUsableResponse> => {
	return await request(adminApi.getUserUsableNotificationTargets, {
		data: { user_id },
	});
};

export const getAdminUserNotificationTasks = async (data: {
	user_id: number;
	page_num: number;
	page_size: number;
}): Promise<PaginationNotificationTask> => {
	return await request(adminApi.getUserNotificationTasks, { data });
};

export const getAdminUserNotificationTaskDetail = async (data: {
	user_id: number;
	notification_task_id: number;
}): Promise<NotificationTask> => {
	return await request(adminApi.getUserNotificationTaskDetail, { data });
};

export const addAdminUserNotificationTask = async (data: {
	user_id: number;
	notification_source_id: number;
	notification_target_id: number;
	enable: boolean;
	title: string;
	trigger_type: number;
	trigger_event_id?: number;
}): Promise<NormalResponse> => {
	return await request(adminApi.addUserNotificationTask, { data });
};

export const updateAdminUserNotificationTask = async (data: {
	user_id: number;
	notification_task_id: number;
	title?: string;
	enable?: boolean;
	trigger_type?: number;
	trigger_event_id?: number;
	notification_source_id?: number;
	notification_target_id?: number;
}): Promise<NormalResponse> => {
	return await request(adminApi.updateUserNotificationTask, { data });
};

export const deleteAdminUserNotificationTask = async (data: {
	user_id: number;
	notification_task_ids: number[];
}): Promise<NormalResponse> => {
	return await request(adminApi.deleteUserNotificationTask, { data });
};

export const deleteAdminUser = async (user_id: number): Promise<NormalResponse> => {
	return await request(adminApi.deleteUser, {
		data: { user_id },
	});
};

export const searchAdminDocuments = async (data: {
	keyword?: string;
	page_num?: number;
	page_size?: number;
}): Promise<PaginationData<AdminDocumentSummary>> => {
	return await request(adminApi.searchDocuments, { data });
};

export const getAdminDocumentDetail = async (
	document_id: number,
): Promise<DocumentDetailResponse> => {
	return await request(adminApi.getDocumentDetail, {
		data: { document_id },
	});
};

export const deleteAdminDocuments = async (
	document_ids: number[],
): Promise<NormalResponse> => {
	return await request(adminApi.deleteDocuments, {
		data: { document_ids },
	});
};

export const searchAdminSections = async (data: {
	keyword?: string;
	page_num?: number;
	page_size?: number;
}): Promise<PaginationData<AdminSectionSummary>> => {
	return await request(adminApi.searchSections, { data });
};

export const getAdminSectionDetail = async (
	section_id: number,
): Promise<SectionInfo> => {
	return await request(adminApi.getSectionDetail, {
		data: { section_id },
	});
};

export const deleteAdminSections = async (
	section_ids: number[],
): Promise<NormalResponse> => {
	return await request(adminApi.deleteSections, {
		data: { section_ids },
	});
};
