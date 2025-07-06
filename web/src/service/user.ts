import userApi from '@/api/user'
import { BindEmailVerifyRequest, DefaultEngineUpdateRequest, DefaultModelUpdateRequest, EmailUserCreateVerifyRequest, FollowUserRequest, InifiniteScrollPagnitionUserPublicInfo, InitialPasswordResponse, NormalResponse, PasswordUpdateRequest, PrivateUserInfo, SearchUserFansRequest, SearchUserFollowsRequest, TokenResponse, UserInfoRequest, UserInfoUpdateRequest, UserLoginRequest, UserPublicInfo } from '@/generated';
import { request } from '@/lib/request';

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

export const updateUserDefaultModel = async (data: DefaultModelUpdateRequest): Promise<NormalResponse> => {
    return await request(userApi.updateDefaultModel, { data })
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