import accessRequestApi from '@/api/access-request';
import { request } from '@/lib/request';
import type { NormalResponse, UserPublicInfo } from '@/generated';

export enum AccessRequestTargetType {
	SECTION = 0,
	DOCUMENT = 1,
}

export enum AccessRequestStatus {
	PENDING = 0,
	APPROVED = 1,
	REJECTED = 2,
	CANCELLED = 3,
}

export type AccessRequestInfo = {
	id: number;
	target_type: AccessRequestTargetType;
	target_id: number;
	applicant: UserPublicInfo;
	message: string | null;
	status: AccessRequestStatus;
	granted_authority: number | null;
	handler: UserPublicInfo | null;
	handle_message: string | null;
	create_time: string;
	update_time: string | null;
};

export type AccessRequestCreateRequest = {
	target_type: AccessRequestTargetType;
	target_id: number;
	message?: string | null;
};

export type AccessRequestListRequest = {
	target_type: AccessRequestTargetType;
	target_id: number;
	status?: AccessRequestStatus | null;
};

export type AccessRequestMineRequest = {
	target_type: AccessRequestTargetType;
	target_id: number;
};

export type AccessRequestHandleRequest = {
	access_request_id: number;
	approve: boolean;
	authority?: number | null;
	handle_message?: string | null;
};

export type AccessRequestCancelRequest = {
	access_request_id: number;
};

export type AccessRequestListResponse = {
	data: AccessRequestInfo[];
};

export type AccessRequestMineResponse = {
	access_request: AccessRequestInfo | null;
};

export const createAccessRequest = async (
	data: AccessRequestCreateRequest,
): Promise<AccessRequestInfo> => {
	return await request(accessRequestApi.create, { data });
};

export const listAccessRequests = async (
	data: AccessRequestListRequest,
): Promise<AccessRequestListResponse> => {
	return await request(accessRequestApi.list, { data });
};

export const getMyAccessRequest = async (
	data: AccessRequestMineRequest,
): Promise<AccessRequestMineResponse> => {
	return await request(accessRequestApi.mine, { data });
};

export const handleAccessRequest = async (
	data: AccessRequestHandleRequest,
): Promise<AccessRequestInfo> => {
	return await request(accessRequestApi.handle, { data });
};

export const cancelAccessRequest = async (
	data: AccessRequestCancelRequest,
): Promise<NormalResponse> => {
	return await request(accessRequestApi.cancel, { data });
};
