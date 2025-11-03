import userApi from '@/api/user'
import { BindEmailVerifyRequest, BindPhoneCodeCreateRequest, BindPhoneCodeVerifyRequest, DefaultEngineUpdateRequest, DefaultFileSystemUpdateRequest, DefaultModelUpdateRequest, DefaultReadMarkReasonUpdateRequest, EmailUserCreateVerifyRequest, FollowUserRequest, GithubUserBind, GithubUserCreate, GoogleUserBind, GoogleUserCreate, InifiniteScrollPagnitionUserPublicInfo, InitialPasswordResponse, NormalResponse, PasswordUpdateRequest, PrivateUserInfo, SearchUserFansRequest, SearchUserFollowsRequest, SearchUserRequest, SmsUserCodeCreateRequest, SmsUserCodeVerifyCreate, TokenResponse, UserInfoRequest, UserInfoUpdateRequest, UserLoginRequest, UserPublicInfo, WeChatWebUserBindRequest, WeChatWebUserCreateRequest } from '@/generated';
import { request } from '@/lib/request';

export const searchUser = async (data: SearchUserRequest): Promise<InifiniteScrollPagnitionUserPublicInfo> => {
    return await request(userApi.searchUser, {
        data
    })
}

export const getUserFans = async (data: SearchUserFansRequest): Promise<InifiniteScrollPagnitionUserPublicInfo> => {
    return await request(userApi.getUserFans, {
        data
    })
}

export const getUserFollows = async (data: SearchUserFollowsRequest): Promise<InifiniteScrollPagnitionUserPublicInfo> => {
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

export const createEmailUserVerify = async (data: EmailUserCreateVerifyRequest): Promise<TokenResponse> => {
    return await request(userApi.createEmailUserVerify, {
        data
    })
}

export const deleteUser = async (): Promise<NormalResponse> => {
    return await request(userApi.deleteUser)
}

export const loginUser = async (data: UserLoginRequest): Promise<TokenResponse> => {
    return await request(userApi.loginUser, {
        data
    })
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

export const bindEmailVerify = async (data: BindEmailVerifyRequest): Promise<NormalResponse> => {
    return await request(userApi.bindEmailVerify, {
        data
    })
}

export const createUserByGoogle = async (data: GoogleUserCreate): Promise<TokenResponse> => {
    return await request(userApi.createUserByGoogle, {
        data
    })
}

export const createUserByGithub = async (data: GithubUserCreate): Promise<TokenResponse> => {
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

export const createSMSUserVerify = async (data: SmsUserCodeVerifyCreate): Promise<TokenResponse> => {
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

export const createUserByWechat = async (data: WeChatWebUserCreateRequest): Promise<TokenResponse> => {
    return await request(userApi.createUserByWechatWeb, {
        data
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