import accessRequestApi from '@/api/access-request';
import { request } from '@/lib/request';
import type {
	NormalResponse,
	UserPublicInfo,
	AccessRequestCreateRequest,
	AccessRequestListRequest,
	AccessRequestMineRequest,
	AccessRequestHandleRequest,
	AccessRequestCancelRequest,
} from '@/generated';

// Re-export generated request models so consumers can keep importing from this module.
export type {
	AccessRequestCreateRequest,
	AccessRequestListRequest,
	AccessRequestMineRequest,
	AccessRequestHandleRequest,
	AccessRequestCancelRequest,
} from '@/generated';

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

// NOTE: kept local (not the generated model) — the generated type declares Date
// timestamps, but the raw `request` wrapper returns plain JSON strings.
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
