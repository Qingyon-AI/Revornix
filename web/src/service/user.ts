import userApi from '@/api/user'
import { BindEmailCodeVerifyRequest, BindEmailRequest, BindEmailVerifyRequest, BindPhoneCodeCreateRequest, BindPhoneCodeVerifyRequest, DefaultEngineUpdateRequest, DefaultFileSystemUpdateRequest, DefaultModelUpdateRequest, DefaultReadMarkReasonUpdateRequest, EmailCreateRequest, EmailUserCreateCodeVerifyRequest, EmailUserCreateVerifyRequest, FollowUserRequest, GithubUserBind, GithubUserCreate, GoogleUserBind, GoogleUserCreate, InfiniteScrollPaginationUserPublicInfo, InitialPasswordResponse, NormalResponse, PasswordUpdateRequest, PrivateUserInfo, SearchUserFansRequest, SearchUserFollowsRequest, SearchUserRequest, SmsUserCodeCreateRequest, SmsUserCodeVerifyCreate, TokenResponse, UserInfoRequest, UserInfoUpdateRequest, UserLoginRequest, UserPublicInfo, WeChatWebUserBindRequest, WeChatWebUserCreateRequest, AuthResponse, TotpRegistrationOptionsResponse, MfaStatusUpdateRequest } from '@/generated';

// Re-export generated models so consumers can keep importing from this module.
export type { AuthResponse, TotpRegistrationOptionsResponse, MfaStatusUpdateRequest } from '@/generated';
import { UserResponseDTO } from '@/generated-pay';
import { request } from '@/lib/request';
import { serverRequest } from '@/lib/request-server';

export type ComputeLedgerItem = {
    id: number;
    delta_points: number;
    balance_after: number;
    reason?: string | null;
    source?: string | null;
    create_time?: string | null;
    expire_time?: string | null;
}

export type ComputeLedgerResponse = {
    items: ComputeLedgerItem[];
    total: number;
    page: number;
    page_size: number;
    has_more: boolean;
}

export type ComputeLedgerRequest = {
    page?: number;
    page_size?: number;
    direction?: 'all' | 'income' | 'expense';
}

// NOTE: PasskeyInfo / TotpInfo are kept local (not the generated models) — the
// generated types declare Date timestamps, but the raw `request` wrapper returns
// plain JSON strings.
export type PasskeyInfo = {
    id: number;
    rp_id?: string | null;
    name?: string | null;
    device_type?: string | null;
    backed_up: boolean;
    last_used_at?: string | null;
    create_time: string;
}

export type PasskeyOptionsResponse = {
    challenge_id: string;
    options: Record<string, any>;
}

export type TotpInfo = {
    enabled: boolean;
    name?: string | null;
    last_used_at?: string | null;
    create_time?: string | null;
}

export const getUserInfoForPaySystem = async (): Promise<UserResponseDTO> => {
    return await request(userApi.getUserInfoForPaySystem)
}

export const getUserComputeLedgerForPaySystem = async (data?: ComputeLedgerRequest): Promise<ComputeLedgerResponse> => {
    return await request(userApi.getUserComputeLedgerForPaySystem, {
        data
    })
}

export const searchUser = async (data: SearchUserRequest): Promise<InfiniteScrollPaginationUserPublicInfo> => {
    return await request(userApi.searchUser, {
        data
    })
}

export type SearchPublicUsersWithKeywordRequest = {
    start?: number | null
    limit?: number
    keyword?: string | null
}

export const searchPublicUsers = async (data: SearchPublicUsersWithKeywordRequest): Promise<InfiniteScrollPaginationUserPublicInfo> => {
    return await request(userApi.searchPublicUsers, {
        data
    })
}

export const getUserFans = async (data: SearchUserFansRequest): Promise<InfiniteScrollPaginationUserPublicInfo> => {
    return await request(userApi.getUserFans, {
        data
    })
}

export const getUserFollows = async (data: SearchUserFollowsRequest): Promise<InfiniteScrollPaginationUserPublicInfo> => {
    return await request(userApi.getUserFollows, {
        data
    })
}

export const followUser = async (data: FollowUserRequest): Promise<NormalResponse> => {
    return await request(userApi.followUser, {
        data
    })
}

export const getUserInfo = async (data: UserInfoRequest): Promise<UserPublicInfo> => {
    return await request(userApi.userInfo, {
        data
    })
}

export const getUserInfoServer = async (
    data: UserInfoRequest,
    headers?: Headers,
): Promise<UserPublicInfo> => {
    return await serverRequest(userApi.userInfo, {
        data,
        headers,
    })
}

export const searchPublicUsersServer = async (data: {
    start?: number
    limit: number
}): Promise<InfiniteScrollPaginationUserPublicInfo> => {
    return await serverRequest(userApi.searchPublicUsers, { data })
}

export const updateToken = async (refresh_token: string): Promise<TokenResponse> => {
    return await request(userApi.updateToken, {
        data: {
            refresh_token
        }
    })
}

export const unBindEmail = async () => {
    return await request(userApi.unBindEmail)
}

export const createEmailUser = async (data: EmailUserCreateVerifyRequest): Promise<TokenResponse> => {
    return await request(userApi.createEmailUser, {
        data
    })
}

export const createEmailUserCodeVerify = async (data: EmailUserCreateCodeVerifyRequest): Promise<TokenResponse> => {
    return await request(userApi.createEmailUserCodeVerify, {
        data
    })
}

export const createEmailUserCode = async (data: EmailCreateRequest): Promise<NormalResponse> => {
    return await request(userApi.createEmailUserCode, {
        data
    })
}

export const deleteUser = async (): Promise<NormalResponse> => {
    return await request(userApi.deleteUser)
}

export const loginUser = async (data: UserLoginRequest): Promise<AuthResponse> => {
    return await request(userApi.loginUser, {
        data
    })
}

export const listPasskeys = async (): Promise<PasskeyInfo[]> => {
    return await request(userApi.passkeyList)
}

export const createPasskeyRegistrationOptions = async (): Promise<PasskeyOptionsResponse> => {
    return await request(userApi.passkeyRegisterOptions)
}

export const verifyPasskeyRegistration = async (data: {
    challenge_id: string;
    credential: Record<string, any>;
    name?: string;
}): Promise<TokenResponse> => {
    return await request(userApi.passkeyRegisterVerify, { data })
}

export const createPasskeyAuthenticationOptions = async (data: {
    challenge_id: string;
}): Promise<PasskeyOptionsResponse> => {
    return await request(userApi.passkeyAuthOptions, {
        data,
        redirectOnAuthFailure: false,
    })
}

export const verifyPasskeyAuthentication = async (data: {
    challenge_id: string;
    credential: Record<string, any>;
}): Promise<TokenResponse> => {
    return await request(userApi.passkeyAuthVerify, {
        data,
        redirectOnAuthFailure: false,
    })
}

export const deletePasskey = async (data: {
    credential_id: number;
}): Promise<TokenResponse> => {
    return await request(userApi.passkeyDelete, { data })
}

export const updateMfaStatus = async (data: MfaStatusUpdateRequest): Promise<TokenResponse> => {
    return await request(userApi.updateMfaStatus, { data })
}

export const getTotpStatus = async (): Promise<TotpInfo> => {
    return await request(userApi.totpStatus)
}

export const createTotpRegistrationOptions = async (): Promise<TotpRegistrationOptionsResponse> => {
    return await request(userApi.totpRegisterOptions)
}

export const verifyTotpRegistration = async (data: {
    challenge_id: string;
    code: string;
    name?: string;
}): Promise<TokenResponse> => {
    return await request(userApi.totpRegisterVerify, { data })
}

export const verifyTotpAuthentication = async (data: {
    challenge_id: string;
    code: string;
}): Promise<TokenResponse> => {
    return await request(userApi.totpAuthVerify, {
        data,
        redirectOnAuthFailure: false,
    })
}

export const deleteTotp = async (): Promise<TokenResponse> => {
    return await request(userApi.totpDelete)
}

export const getMyInfo = async (): Promise<PrivateUserInfo> => {
    return await request(userApi.myInfo)
}

export const getMyInitialPassword = async (): Promise<InitialPasswordResponse> => {
    return await request(userApi.initialPassword)
}

export const updateUserInfo = async (newUserInfo: UserInfoUpdateRequest): Promise<NormalResponse> => {
    return await request(userApi.updateUserInfo, { data: newUserInfo })
}

export const updateUserDefaultReadMarkReason = async (data: DefaultReadMarkReasonUpdateRequest): Promise<NormalResponse> => {
    return await request(userApi.updateDefaultReadMarkReason, { data })
}

export const updateUserDefaultModel = async (data: DefaultModelUpdateRequest): Promise<NormalResponse> => {
    return await request(userApi.updateDefaultModel, { data })
}

export const updateUserDefaultFileSystem = async (data: DefaultFileSystemUpdateRequest): Promise<NormalResponse> => {
    return await request(userApi.updateDefaultFileSystem, { data })
}

export const updateUserDefaultEngine = async (data: DefaultEngineUpdateRequest): Promise<NormalResponse> => {
    return await request(userApi.updateDefaultEngine, { data })
}

export const updatePasswordEmailCode = async (): Promise<NormalResponse> => {
    return await request(userApi.updatePasswordEmailCode)
}

export const updatePassword = async (data: PasswordUpdateRequest): Promise<NormalResponse> => {
    return await request(userApi.updatePassword, {
        data
    })
}

export const bindEmailCodeVerify = async (data: BindEmailCodeVerifyRequest): Promise<NormalResponse> => {
    return await request(userApi.bindEmailCodeVerify, {
        data
    })
}

export const bindEmailCode = async (data: BindEmailRequest): Promise<NormalResponse> => {
    return await request(userApi.bindEmailCode, {
        data
    })
}

export const bindEmail = async (data: BindEmailVerifyRequest): Promise<NormalResponse> => {
    return await request(userApi.bindEmail, {
        data
    })
}

export const createUserByGoogle = async (data: GoogleUserCreate): Promise<AuthResponse> => {
    return await request(userApi.createUserByGoogle, {
        data
    })
}

export const createUserByGithub = async (data: GithubUserCreate): Promise<AuthResponse> => {
    return await request(userApi.createUserByGithub, {
        data
    })
}

export const bindGitHub = async (data: GithubUserBind) => {
    return await request(userApi.bindGitHub, {
        data
    })
}

export const bindGoogle = async (data: GoogleUserBind) => {
    return await request(userApi.bindGoogle, {
        data
    })
}

export const unBindGitHub = async () => {
    return await request(userApi.unBindGitHub)
}

export const unBindGoogle = async () => {
    return await request(userApi.unBindGoogle)
}

export const createUserSMSCode = async (data: SmsUserCodeCreateRequest): Promise<NormalResponse> => {
    return await request(userApi.createSMSCode, {
        data
    })
}

export const createSMSUserVerify = async (data: SmsUserCodeVerifyCreate): Promise<AuthResponse> => {
    return await request(userApi.createSMSUserVerify, {
        data
    })
}

export const bindPhoneCode = async (data: BindPhoneCodeCreateRequest): Promise<NormalResponse> => {
    return await request(userApi.bindPhoneCode, {
        data
    })
}

export const bindPhoneVerify = async (data: BindPhoneCodeVerifyRequest): Promise<NormalResponse> => {
    return await request(userApi.bindPhoneVerify, {
        data
    })
}

export const unBindPhone = async () => {
    return await request(userApi.unBindPhone)
}

export const createUserByWechat = async (data: WeChatWebUserCreateRequest): Promise<AuthResponse> => {
    return await request(userApi.createUserByWechatWeb, {
        data
    })
}

export type WechatOfficialQrCreateResponse = {
    scene_str: string;
    ticket: string;
    image_url: string;
    expires_in: number;
};

export type WechatOfficialQrStatusResponse = {
    status: 'pending' | 'confirmed' | 'expired';
    access_token?: string | null;
    refresh_token?: string | null;
    expires_in?: number | null;
    mfa_required?: boolean;
    challenge_id?: string | null;
    methods?: string[];
};

export const createWechatOfficialQrcode = async (): Promise<WechatOfficialQrCreateResponse> => {
    return await request(userApi.createWechatOfficialQrcode, {
        data: {}
    })
}

export const queryWechatOfficialQrStatus = async (
    scene_str: string
): Promise<WechatOfficialQrStatusResponse> => {
    return await request(userApi.queryWechatOfficialQrStatus, {
        data: { scene_str }
    })
}

export type WechatOfficialBindQrCreateResponse = {
    scene_str: string;
    ticket: string;
    image_url: string;
    expires_in: number;
};

export type WechatOfficialBindQrStatusResponse = {
    status: 'pending' | 'confirmed' | 'conflict' | 'expired';
    message?: string | null;
};

export const createWechatOfficialBindQrcode = async (): Promise<WechatOfficialBindQrCreateResponse> => {
    return await request(userApi.createWechatOfficialBindQrcode, {
        data: {}
    })
}

export const queryWechatOfficialBindStatus = async (
    scene_str: string
): Promise<WechatOfficialBindQrStatusResponse> => {
    return await request(userApi.queryWechatOfficialBindStatus, {
        data: { scene_str }
    })
}

export const bindWeChat = async (data: WeChatWebUserBindRequest): Promise<NormalResponse> => {
    return await request(userApi.bindWeChat, {
        data
    })
}

export const unBindWeChat = async () => {
    return await request(userApi.unBindWeChat)
}
