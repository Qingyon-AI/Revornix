/* tslint:disable */
/* eslint-disable */
/**
 * Revornix Main Backend
 * No description provided (generated by Openapi Generator https://github.com/openapitools/openapi-generator)
 *
 * The version of the OpenAPI document: 0.0.1
 * Contact: 1142704468@qq.com
 *
 * NOTE: This class is auto generated by OpenAPI Generator (https://openapi-generator.tech).
 * https://openapi-generator.tech
 * Do not edit the class manually.
 */


import * as runtime from '../runtime';
import type {
  BindEmailVerifyRequest,
  DefaultEngineUpdateRequest,
  DefaultFileSystemUpdateRequest,
  DefaultModelUpdateRequest,
  DefaultReadMarkReasonUpdateRequest,
  EmailUserCreateVerifyRequest,
  FollowUserRequest,
  HTTPValidationError,
  InifiniteScrollPagnitionUserPublicInfo,
  InitialPasswordResponse,
  NormalResponse,
  PasswordUpdateRequest,
  PrivateUserInfo,
  SearchUserFansRequest,
  SearchUserFollowsRequest,
  TokenResponse,
  TokenUpdateRequest,
  UserInfoRequest,
  UserInfoUpdateRequest,
  UserLoginRequest,
  UserPublicInfo,
} from '../models/index';
import {
    BindEmailVerifyRequestFromJSON,
    BindEmailVerifyRequestToJSON,
    DefaultEngineUpdateRequestFromJSON,
    DefaultEngineUpdateRequestToJSON,
    DefaultFileSystemUpdateRequestFromJSON,
    DefaultFileSystemUpdateRequestToJSON,
    DefaultModelUpdateRequestFromJSON,
    DefaultModelUpdateRequestToJSON,
    DefaultReadMarkReasonUpdateRequestFromJSON,
    DefaultReadMarkReasonUpdateRequestToJSON,
    EmailUserCreateVerifyRequestFromJSON,
    EmailUserCreateVerifyRequestToJSON,
    FollowUserRequestFromJSON,
    FollowUserRequestToJSON,
    HTTPValidationErrorFromJSON,
    HTTPValidationErrorToJSON,
    InifiniteScrollPagnitionUserPublicInfoFromJSON,
    InifiniteScrollPagnitionUserPublicInfoToJSON,
    InitialPasswordResponseFromJSON,
    InitialPasswordResponseToJSON,
    NormalResponseFromJSON,
    NormalResponseToJSON,
    PasswordUpdateRequestFromJSON,
    PasswordUpdateRequestToJSON,
    PrivateUserInfoFromJSON,
    PrivateUserInfoToJSON,
    SearchUserFansRequestFromJSON,
    SearchUserFansRequestToJSON,
    SearchUserFollowsRequestFromJSON,
    SearchUserFollowsRequestToJSON,
    TokenResponseFromJSON,
    TokenResponseToJSON,
    TokenUpdateRequestFromJSON,
    TokenUpdateRequestToJSON,
    UserInfoRequestFromJSON,
    UserInfoRequestToJSON,
    UserInfoUpdateRequestFromJSON,
    UserInfoUpdateRequestToJSON,
    UserLoginRequestFromJSON,
    UserLoginRequestToJSON,
    UserPublicInfoFromJSON,
    UserPublicInfoToJSON,
} from '../models/index';

export interface BindEmailVerifyUserBindEmailVerifyPostRequest {
    bindEmailVerifyRequest: BindEmailVerifyRequest;
    authorization?: string | null;
    xForwardedFor?: string | null;
}

export interface CreateUserByEmailVerifyUserCreateEmailVerifyPostRequest {
    emailUserCreateVerifyRequest: EmailUserCreateVerifyRequest;
}

export interface DeleteUserUserDeletePostRequest {
    authorization?: string | null;
    xForwardedFor?: string | null;
}

export interface FollowUserUserFollowPostRequest {
    followUserRequest: FollowUserRequest;
    authorization?: string | null;
    xForwardedFor?: string | null;
}

export interface InitialSeePasswordUserPasswordInitialSeePostRequest {
    authorization?: string | null;
    xForwardedFor?: string | null;
}

export interface LoginUserLoginPostRequest {
    userLoginRequest: UserLoginRequest;
}

export interface MyInfoUserMineInfoPostRequest {
    authorization?: string | null;
    xForwardedFor?: string | null;
}

export interface SearchUserFansUserFansPostRequest {
    searchUserFansRequest: SearchUserFansRequest;
    authorization?: string | null;
    xForwardedFor?: string | null;
}

export interface SearchUserFollowsUserFollowsPostRequest {
    searchUserFollowsRequest: SearchUserFollowsRequest;
    authorization?: string | null;
    xForwardedFor?: string | null;
}

export interface UpdateDefaultDocumentParseEngineUserDefaultEngineUpdatePostRequest {
    defaultEngineUpdateRequest: DefaultEngineUpdateRequest;
    authorization?: string | null;
    xForwardedFor?: string | null;
}

export interface UpdateDefaultFileSystemUserDefaultFileSystemUpdatePostRequest {
    defaultFileSystemUpdateRequest: DefaultFileSystemUpdateRequest;
    authorization?: string | null;
    xForwardedFor?: string | null;
}

export interface UpdateDefaultModelUserDefaultModelUpdatePostRequest {
    defaultModelUpdateRequest: DefaultModelUpdateRequest;
    authorization?: string | null;
    xForwardedFor?: string | null;
}

export interface UpdateMyDefaultReadMarkReasonUserReadMarkReasonUpdatePostRequest {
    defaultReadMarkReasonUpdateRequest: DefaultReadMarkReasonUpdateRequest;
    authorization?: string | null;
    xForwardedFor?: string | null;
}

export interface UpdateMyInfoUserUpdatePostRequest {
    userInfoUpdateRequest: UserInfoUpdateRequest;
    authorization?: string | null;
    xForwardedFor?: string | null;
}

export interface UpdatePasswordUserPasswordUpdatePostRequest {
    passwordUpdateRequest: PasswordUpdateRequest;
    authorization?: string | null;
    xForwardedFor?: string | null;
}

export interface UpdateTokenUserTokenUpdatePostRequest {
    tokenUpdateRequest: TokenUpdateRequest;
}

export interface UserInfoUserInfoPostRequest {
    userInfoRequest: UserInfoRequest;
    authorization?: string | null;
    xForwardedFor?: string | null;
}

/**
 * 
 */
export class UserApi extends runtime.BaseAPI {

    /**
     * Bind Email Verify
     */
    async bindEmailVerifyUserBindEmailVerifyPostRaw(requestParameters: BindEmailVerifyUserBindEmailVerifyPostRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<runtime.ApiResponse<NormalResponse>> {
        if (requestParameters['bindEmailVerifyRequest'] == null) {
            throw new runtime.RequiredError(
                'bindEmailVerifyRequest',
                'Required parameter "bindEmailVerifyRequest" was null or undefined when calling bindEmailVerifyUserBindEmailVerifyPost().'
            );
        }

        const queryParameters: any = {};

        const headerParameters: runtime.HTTPHeaders = {};

        headerParameters['Content-Type'] = 'application/json';

        if (requestParameters['authorization'] != null) {
            headerParameters['authorization'] = String(requestParameters['authorization']);
        }

        if (requestParameters['xForwardedFor'] != null) {
            headerParameters['x-forwarded-for'] = String(requestParameters['xForwardedFor']);
        }


        let urlPath = `/user/bind/email/verify`;

        const response = await this.request({
            path: urlPath,
            method: 'POST',
            headers: headerParameters,
            query: queryParameters,
            body: BindEmailVerifyRequestToJSON(requestParameters['bindEmailVerifyRequest']),
        }, initOverrides);

        return new runtime.JSONApiResponse(response, (jsonValue) => NormalResponseFromJSON(jsonValue));
    }

    /**
     * Bind Email Verify
     */
    async bindEmailVerifyUserBindEmailVerifyPost(requestParameters: BindEmailVerifyUserBindEmailVerifyPostRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<NormalResponse> {
        const response = await this.bindEmailVerifyUserBindEmailVerifyPostRaw(requestParameters, initOverrides);
        return await response.value();
    }

    /**
     * Create User By Email Verify
     */
    async createUserByEmailVerifyUserCreateEmailVerifyPostRaw(requestParameters: CreateUserByEmailVerifyUserCreateEmailVerifyPostRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<runtime.ApiResponse<TokenResponse>> {
        if (requestParameters['emailUserCreateVerifyRequest'] == null) {
            throw new runtime.RequiredError(
                'emailUserCreateVerifyRequest',
                'Required parameter "emailUserCreateVerifyRequest" was null or undefined when calling createUserByEmailVerifyUserCreateEmailVerifyPost().'
            );
        }

        const queryParameters: any = {};

        const headerParameters: runtime.HTTPHeaders = {};

        headerParameters['Content-Type'] = 'application/json';


        let urlPath = `/user/create/email/verify`;

        const response = await this.request({
            path: urlPath,
            method: 'POST',
            headers: headerParameters,
            query: queryParameters,
            body: EmailUserCreateVerifyRequestToJSON(requestParameters['emailUserCreateVerifyRequest']),
        }, initOverrides);

        return new runtime.JSONApiResponse(response, (jsonValue) => TokenResponseFromJSON(jsonValue));
    }

    /**
     * Create User By Email Verify
     */
    async createUserByEmailVerifyUserCreateEmailVerifyPost(requestParameters: CreateUserByEmailVerifyUserCreateEmailVerifyPostRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<TokenResponse> {
        const response = await this.createUserByEmailVerifyUserCreateEmailVerifyPostRaw(requestParameters, initOverrides);
        return await response.value();
    }

    /**
     * Delete User
     */
    async deleteUserUserDeletePostRaw(requestParameters: DeleteUserUserDeletePostRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<runtime.ApiResponse<NormalResponse>> {
        const queryParameters: any = {};

        const headerParameters: runtime.HTTPHeaders = {};

        if (requestParameters['authorization'] != null) {
            headerParameters['authorization'] = String(requestParameters['authorization']);
        }

        if (requestParameters['xForwardedFor'] != null) {
            headerParameters['x-forwarded-for'] = String(requestParameters['xForwardedFor']);
        }


        let urlPath = `/user/delete`;

        const response = await this.request({
            path: urlPath,
            method: 'POST',
            headers: headerParameters,
            query: queryParameters,
        }, initOverrides);

        return new runtime.JSONApiResponse(response, (jsonValue) => NormalResponseFromJSON(jsonValue));
    }

    /**
     * Delete User
     */
    async deleteUserUserDeletePost(requestParameters: DeleteUserUserDeletePostRequest = {}, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<NormalResponse> {
        const response = await this.deleteUserUserDeletePostRaw(requestParameters, initOverrides);
        return await response.value();
    }

    /**
     * Follow User
     */
    async followUserUserFollowPostRaw(requestParameters: FollowUserUserFollowPostRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<runtime.ApiResponse<NormalResponse>> {
        if (requestParameters['followUserRequest'] == null) {
            throw new runtime.RequiredError(
                'followUserRequest',
                'Required parameter "followUserRequest" was null or undefined when calling followUserUserFollowPost().'
            );
        }

        const queryParameters: any = {};

        const headerParameters: runtime.HTTPHeaders = {};

        headerParameters['Content-Type'] = 'application/json';

        if (requestParameters['authorization'] != null) {
            headerParameters['authorization'] = String(requestParameters['authorization']);
        }

        if (requestParameters['xForwardedFor'] != null) {
            headerParameters['x-forwarded-for'] = String(requestParameters['xForwardedFor']);
        }


        let urlPath = `/user/follow`;

        const response = await this.request({
            path: urlPath,
            method: 'POST',
            headers: headerParameters,
            query: queryParameters,
            body: FollowUserRequestToJSON(requestParameters['followUserRequest']),
        }, initOverrides);

        return new runtime.JSONApiResponse(response, (jsonValue) => NormalResponseFromJSON(jsonValue));
    }

    /**
     * Follow User
     */
    async followUserUserFollowPost(requestParameters: FollowUserUserFollowPostRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<NormalResponse> {
        const response = await this.followUserUserFollowPostRaw(requestParameters, initOverrides);
        return await response.value();
    }

    /**
     * Initial See Password
     */
    async initialSeePasswordUserPasswordInitialSeePostRaw(requestParameters: InitialSeePasswordUserPasswordInitialSeePostRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<runtime.ApiResponse<InitialPasswordResponse>> {
        const queryParameters: any = {};

        const headerParameters: runtime.HTTPHeaders = {};

        if (requestParameters['authorization'] != null) {
            headerParameters['authorization'] = String(requestParameters['authorization']);
        }

        if (requestParameters['xForwardedFor'] != null) {
            headerParameters['x-forwarded-for'] = String(requestParameters['xForwardedFor']);
        }


        let urlPath = `/user/password/initial-see`;

        const response = await this.request({
            path: urlPath,
            method: 'POST',
            headers: headerParameters,
            query: queryParameters,
        }, initOverrides);

        return new runtime.JSONApiResponse(response, (jsonValue) => InitialPasswordResponseFromJSON(jsonValue));
    }

    /**
     * Initial See Password
     */
    async initialSeePasswordUserPasswordInitialSeePost(requestParameters: InitialSeePasswordUserPasswordInitialSeePostRequest = {}, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<InitialPasswordResponse> {
        const response = await this.initialSeePasswordUserPasswordInitialSeePostRaw(requestParameters, initOverrides);
        return await response.value();
    }

    /**
     * Login
     */
    async loginUserLoginPostRaw(requestParameters: LoginUserLoginPostRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<runtime.ApiResponse<TokenResponse>> {
        if (requestParameters['userLoginRequest'] == null) {
            throw new runtime.RequiredError(
                'userLoginRequest',
                'Required parameter "userLoginRequest" was null or undefined when calling loginUserLoginPost().'
            );
        }

        const queryParameters: any = {};

        const headerParameters: runtime.HTTPHeaders = {};

        headerParameters['Content-Type'] = 'application/json';


        let urlPath = `/user/login`;

        const response = await this.request({
            path: urlPath,
            method: 'POST',
            headers: headerParameters,
            query: queryParameters,
            body: UserLoginRequestToJSON(requestParameters['userLoginRequest']),
        }, initOverrides);

        return new runtime.JSONApiResponse(response, (jsonValue) => TokenResponseFromJSON(jsonValue));
    }

    /**
     * Login
     */
    async loginUserLoginPost(requestParameters: LoginUserLoginPostRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<TokenResponse> {
        const response = await this.loginUserLoginPostRaw(requestParameters, initOverrides);
        return await response.value();
    }

    /**
     * My Info
     */
    async myInfoUserMineInfoPostRaw(requestParameters: MyInfoUserMineInfoPostRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<runtime.ApiResponse<PrivateUserInfo>> {
        const queryParameters: any = {};

        const headerParameters: runtime.HTTPHeaders = {};

        if (requestParameters['authorization'] != null) {
            headerParameters['authorization'] = String(requestParameters['authorization']);
        }

        if (requestParameters['xForwardedFor'] != null) {
            headerParameters['x-forwarded-for'] = String(requestParameters['xForwardedFor']);
        }


        let urlPath = `/user/mine/info`;

        const response = await this.request({
            path: urlPath,
            method: 'POST',
            headers: headerParameters,
            query: queryParameters,
        }, initOverrides);

        return new runtime.JSONApiResponse(response, (jsonValue) => PrivateUserInfoFromJSON(jsonValue));
    }

    /**
     * My Info
     */
    async myInfoUserMineInfoPost(requestParameters: MyInfoUserMineInfoPostRequest = {}, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<PrivateUserInfo> {
        const response = await this.myInfoUserMineInfoPostRaw(requestParameters, initOverrides);
        return await response.value();
    }

    /**
     * Search User Fans
     */
    async searchUserFansUserFansPostRaw(requestParameters: SearchUserFansUserFansPostRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<runtime.ApiResponse<InifiniteScrollPagnitionUserPublicInfo>> {
        if (requestParameters['searchUserFansRequest'] == null) {
            throw new runtime.RequiredError(
                'searchUserFansRequest',
                'Required parameter "searchUserFansRequest" was null or undefined when calling searchUserFansUserFansPost().'
            );
        }

        const queryParameters: any = {};

        const headerParameters: runtime.HTTPHeaders = {};

        headerParameters['Content-Type'] = 'application/json';

        if (requestParameters['authorization'] != null) {
            headerParameters['authorization'] = String(requestParameters['authorization']);
        }

        if (requestParameters['xForwardedFor'] != null) {
            headerParameters['x-forwarded-for'] = String(requestParameters['xForwardedFor']);
        }


        let urlPath = `/user/fans`;

        const response = await this.request({
            path: urlPath,
            method: 'POST',
            headers: headerParameters,
            query: queryParameters,
            body: SearchUserFansRequestToJSON(requestParameters['searchUserFansRequest']),
        }, initOverrides);

        return new runtime.JSONApiResponse(response, (jsonValue) => InifiniteScrollPagnitionUserPublicInfoFromJSON(jsonValue));
    }

    /**
     * Search User Fans
     */
    async searchUserFansUserFansPost(requestParameters: SearchUserFansUserFansPostRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<InifiniteScrollPagnitionUserPublicInfo> {
        const response = await this.searchUserFansUserFansPostRaw(requestParameters, initOverrides);
        return await response.value();
    }

    /**
     * Search User Follows
     */
    async searchUserFollowsUserFollowsPostRaw(requestParameters: SearchUserFollowsUserFollowsPostRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<runtime.ApiResponse<InifiniteScrollPagnitionUserPublicInfo>> {
        if (requestParameters['searchUserFollowsRequest'] == null) {
            throw new runtime.RequiredError(
                'searchUserFollowsRequest',
                'Required parameter "searchUserFollowsRequest" was null or undefined when calling searchUserFollowsUserFollowsPost().'
            );
        }

        const queryParameters: any = {};

        const headerParameters: runtime.HTTPHeaders = {};

        headerParameters['Content-Type'] = 'application/json';

        if (requestParameters['authorization'] != null) {
            headerParameters['authorization'] = String(requestParameters['authorization']);
        }

        if (requestParameters['xForwardedFor'] != null) {
            headerParameters['x-forwarded-for'] = String(requestParameters['xForwardedFor']);
        }


        let urlPath = `/user/follows`;

        const response = await this.request({
            path: urlPath,
            method: 'POST',
            headers: headerParameters,
            query: queryParameters,
            body: SearchUserFollowsRequestToJSON(requestParameters['searchUserFollowsRequest']),
        }, initOverrides);

        return new runtime.JSONApiResponse(response, (jsonValue) => InifiniteScrollPagnitionUserPublicInfoFromJSON(jsonValue));
    }

    /**
     * Search User Follows
     */
    async searchUserFollowsUserFollowsPost(requestParameters: SearchUserFollowsUserFollowsPostRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<InifiniteScrollPagnitionUserPublicInfo> {
        const response = await this.searchUserFollowsUserFollowsPostRaw(requestParameters, initOverrides);
        return await response.value();
    }

    /**
     * Update Default Document Parse Engine
     */
    async updateDefaultDocumentParseEngineUserDefaultEngineUpdatePostRaw(requestParameters: UpdateDefaultDocumentParseEngineUserDefaultEngineUpdatePostRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<runtime.ApiResponse<NormalResponse>> {
        if (requestParameters['defaultEngineUpdateRequest'] == null) {
            throw new runtime.RequiredError(
                'defaultEngineUpdateRequest',
                'Required parameter "defaultEngineUpdateRequest" was null or undefined when calling updateDefaultDocumentParseEngineUserDefaultEngineUpdatePost().'
            );
        }

        const queryParameters: any = {};

        const headerParameters: runtime.HTTPHeaders = {};

        headerParameters['Content-Type'] = 'application/json';

        if (requestParameters['authorization'] != null) {
            headerParameters['authorization'] = String(requestParameters['authorization']);
        }

        if (requestParameters['xForwardedFor'] != null) {
            headerParameters['x-forwarded-for'] = String(requestParameters['xForwardedFor']);
        }


        let urlPath = `/user/default-engine/update`;

        const response = await this.request({
            path: urlPath,
            method: 'POST',
            headers: headerParameters,
            query: queryParameters,
            body: DefaultEngineUpdateRequestToJSON(requestParameters['defaultEngineUpdateRequest']),
        }, initOverrides);

        return new runtime.JSONApiResponse(response, (jsonValue) => NormalResponseFromJSON(jsonValue));
    }

    /**
     * Update Default Document Parse Engine
     */
    async updateDefaultDocumentParseEngineUserDefaultEngineUpdatePost(requestParameters: UpdateDefaultDocumentParseEngineUserDefaultEngineUpdatePostRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<NormalResponse> {
        const response = await this.updateDefaultDocumentParseEngineUserDefaultEngineUpdatePostRaw(requestParameters, initOverrides);
        return await response.value();
    }

    /**
     * Update Default File System
     */
    async updateDefaultFileSystemUserDefaultFileSystemUpdatePostRaw(requestParameters: UpdateDefaultFileSystemUserDefaultFileSystemUpdatePostRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<runtime.ApiResponse<NormalResponse>> {
        if (requestParameters['defaultFileSystemUpdateRequest'] == null) {
            throw new runtime.RequiredError(
                'defaultFileSystemUpdateRequest',
                'Required parameter "defaultFileSystemUpdateRequest" was null or undefined when calling updateDefaultFileSystemUserDefaultFileSystemUpdatePost().'
            );
        }

        const queryParameters: any = {};

        const headerParameters: runtime.HTTPHeaders = {};

        headerParameters['Content-Type'] = 'application/json';

        if (requestParameters['authorization'] != null) {
            headerParameters['authorization'] = String(requestParameters['authorization']);
        }

        if (requestParameters['xForwardedFor'] != null) {
            headerParameters['x-forwarded-for'] = String(requestParameters['xForwardedFor']);
        }


        let urlPath = `/user/default-file-system/update`;

        const response = await this.request({
            path: urlPath,
            method: 'POST',
            headers: headerParameters,
            query: queryParameters,
            body: DefaultFileSystemUpdateRequestToJSON(requestParameters['defaultFileSystemUpdateRequest']),
        }, initOverrides);

        return new runtime.JSONApiResponse(response, (jsonValue) => NormalResponseFromJSON(jsonValue));
    }

    /**
     * Update Default File System
     */
    async updateDefaultFileSystemUserDefaultFileSystemUpdatePost(requestParameters: UpdateDefaultFileSystemUserDefaultFileSystemUpdatePostRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<NormalResponse> {
        const response = await this.updateDefaultFileSystemUserDefaultFileSystemUpdatePostRaw(requestParameters, initOverrides);
        return await response.value();
    }

    /**
     * Update Default Model
     */
    async updateDefaultModelUserDefaultModelUpdatePostRaw(requestParameters: UpdateDefaultModelUserDefaultModelUpdatePostRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<runtime.ApiResponse<NormalResponse>> {
        if (requestParameters['defaultModelUpdateRequest'] == null) {
            throw new runtime.RequiredError(
                'defaultModelUpdateRequest',
                'Required parameter "defaultModelUpdateRequest" was null or undefined when calling updateDefaultModelUserDefaultModelUpdatePost().'
            );
        }

        const queryParameters: any = {};

        const headerParameters: runtime.HTTPHeaders = {};

        headerParameters['Content-Type'] = 'application/json';

        if (requestParameters['authorization'] != null) {
            headerParameters['authorization'] = String(requestParameters['authorization']);
        }

        if (requestParameters['xForwardedFor'] != null) {
            headerParameters['x-forwarded-for'] = String(requestParameters['xForwardedFor']);
        }


        let urlPath = `/user/default-model/update`;

        const response = await this.request({
            path: urlPath,
            method: 'POST',
            headers: headerParameters,
            query: queryParameters,
            body: DefaultModelUpdateRequestToJSON(requestParameters['defaultModelUpdateRequest']),
        }, initOverrides);

        return new runtime.JSONApiResponse(response, (jsonValue) => NormalResponseFromJSON(jsonValue));
    }

    /**
     * Update Default Model
     */
    async updateDefaultModelUserDefaultModelUpdatePost(requestParameters: UpdateDefaultModelUserDefaultModelUpdatePostRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<NormalResponse> {
        const response = await this.updateDefaultModelUserDefaultModelUpdatePostRaw(requestParameters, initOverrides);
        return await response.value();
    }

    /**
     * Update My Default Read Mark Reason
     */
    async updateMyDefaultReadMarkReasonUserReadMarkReasonUpdatePostRaw(requestParameters: UpdateMyDefaultReadMarkReasonUserReadMarkReasonUpdatePostRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<runtime.ApiResponse<NormalResponse>> {
        if (requestParameters['defaultReadMarkReasonUpdateRequest'] == null) {
            throw new runtime.RequiredError(
                'defaultReadMarkReasonUpdateRequest',
                'Required parameter "defaultReadMarkReasonUpdateRequest" was null or undefined when calling updateMyDefaultReadMarkReasonUserReadMarkReasonUpdatePost().'
            );
        }

        const queryParameters: any = {};

        const headerParameters: runtime.HTTPHeaders = {};

        headerParameters['Content-Type'] = 'application/json';

        if (requestParameters['authorization'] != null) {
            headerParameters['authorization'] = String(requestParameters['authorization']);
        }

        if (requestParameters['xForwardedFor'] != null) {
            headerParameters['x-forwarded-for'] = String(requestParameters['xForwardedFor']);
        }


        let urlPath = `/user/read-mark-reason/update`;

        const response = await this.request({
            path: urlPath,
            method: 'POST',
            headers: headerParameters,
            query: queryParameters,
            body: DefaultReadMarkReasonUpdateRequestToJSON(requestParameters['defaultReadMarkReasonUpdateRequest']),
        }, initOverrides);

        return new runtime.JSONApiResponse(response, (jsonValue) => NormalResponseFromJSON(jsonValue));
    }

    /**
     * Update My Default Read Mark Reason
     */
    async updateMyDefaultReadMarkReasonUserReadMarkReasonUpdatePost(requestParameters: UpdateMyDefaultReadMarkReasonUserReadMarkReasonUpdatePostRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<NormalResponse> {
        const response = await this.updateMyDefaultReadMarkReasonUserReadMarkReasonUpdatePostRaw(requestParameters, initOverrides);
        return await response.value();
    }

    /**
     * Update My Info
     */
    async updateMyInfoUserUpdatePostRaw(requestParameters: UpdateMyInfoUserUpdatePostRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<runtime.ApiResponse<NormalResponse>> {
        if (requestParameters['userInfoUpdateRequest'] == null) {
            throw new runtime.RequiredError(
                'userInfoUpdateRequest',
                'Required parameter "userInfoUpdateRequest" was null or undefined when calling updateMyInfoUserUpdatePost().'
            );
        }

        const queryParameters: any = {};

        const headerParameters: runtime.HTTPHeaders = {};

        headerParameters['Content-Type'] = 'application/json';

        if (requestParameters['authorization'] != null) {
            headerParameters['authorization'] = String(requestParameters['authorization']);
        }

        if (requestParameters['xForwardedFor'] != null) {
            headerParameters['x-forwarded-for'] = String(requestParameters['xForwardedFor']);
        }


        let urlPath = `/user/update`;

        const response = await this.request({
            path: urlPath,
            method: 'POST',
            headers: headerParameters,
            query: queryParameters,
            body: UserInfoUpdateRequestToJSON(requestParameters['userInfoUpdateRequest']),
        }, initOverrides);

        return new runtime.JSONApiResponse(response, (jsonValue) => NormalResponseFromJSON(jsonValue));
    }

    /**
     * Update My Info
     */
    async updateMyInfoUserUpdatePost(requestParameters: UpdateMyInfoUserUpdatePostRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<NormalResponse> {
        const response = await this.updateMyInfoUserUpdatePostRaw(requestParameters, initOverrides);
        return await response.value();
    }

    /**
     * Update Password
     */
    async updatePasswordUserPasswordUpdatePostRaw(requestParameters: UpdatePasswordUserPasswordUpdatePostRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<runtime.ApiResponse<NormalResponse>> {
        if (requestParameters['passwordUpdateRequest'] == null) {
            throw new runtime.RequiredError(
                'passwordUpdateRequest',
                'Required parameter "passwordUpdateRequest" was null or undefined when calling updatePasswordUserPasswordUpdatePost().'
            );
        }

        const queryParameters: any = {};

        const headerParameters: runtime.HTTPHeaders = {};

        headerParameters['Content-Type'] = 'application/json';

        if (requestParameters['authorization'] != null) {
            headerParameters['authorization'] = String(requestParameters['authorization']);
        }

        if (requestParameters['xForwardedFor'] != null) {
            headerParameters['x-forwarded-for'] = String(requestParameters['xForwardedFor']);
        }


        let urlPath = `/user/password/update`;

        const response = await this.request({
            path: urlPath,
            method: 'POST',
            headers: headerParameters,
            query: queryParameters,
            body: PasswordUpdateRequestToJSON(requestParameters['passwordUpdateRequest']),
        }, initOverrides);

        return new runtime.JSONApiResponse(response, (jsonValue) => NormalResponseFromJSON(jsonValue));
    }

    /**
     * Update Password
     */
    async updatePasswordUserPasswordUpdatePost(requestParameters: UpdatePasswordUserPasswordUpdatePostRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<NormalResponse> {
        const response = await this.updatePasswordUserPasswordUpdatePostRaw(requestParameters, initOverrides);
        return await response.value();
    }

    /**
     * Update Token
     */
    async updateTokenUserTokenUpdatePostRaw(requestParameters: UpdateTokenUserTokenUpdatePostRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<runtime.ApiResponse<TokenResponse>> {
        if (requestParameters['tokenUpdateRequest'] == null) {
            throw new runtime.RequiredError(
                'tokenUpdateRequest',
                'Required parameter "tokenUpdateRequest" was null or undefined when calling updateTokenUserTokenUpdatePost().'
            );
        }

        const queryParameters: any = {};

        const headerParameters: runtime.HTTPHeaders = {};

        headerParameters['Content-Type'] = 'application/json';


        let urlPath = `/user/token/update`;

        const response = await this.request({
            path: urlPath,
            method: 'POST',
            headers: headerParameters,
            query: queryParameters,
            body: TokenUpdateRequestToJSON(requestParameters['tokenUpdateRequest']),
        }, initOverrides);

        return new runtime.JSONApiResponse(response, (jsonValue) => TokenResponseFromJSON(jsonValue));
    }

    /**
     * Update Token
     */
    async updateTokenUserTokenUpdatePost(requestParameters: UpdateTokenUserTokenUpdatePostRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<TokenResponse> {
        const response = await this.updateTokenUserTokenUpdatePostRaw(requestParameters, initOverrides);
        return await response.value();
    }

    /**
     * User Info
     */
    async userInfoUserInfoPostRaw(requestParameters: UserInfoUserInfoPostRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<runtime.ApiResponse<UserPublicInfo>> {
        if (requestParameters['userInfoRequest'] == null) {
            throw new runtime.RequiredError(
                'userInfoRequest',
                'Required parameter "userInfoRequest" was null or undefined when calling userInfoUserInfoPost().'
            );
        }

        const queryParameters: any = {};

        const headerParameters: runtime.HTTPHeaders = {};

        headerParameters['Content-Type'] = 'application/json';

        if (requestParameters['authorization'] != null) {
            headerParameters['authorization'] = String(requestParameters['authorization']);
        }

        if (requestParameters['xForwardedFor'] != null) {
            headerParameters['x-forwarded-for'] = String(requestParameters['xForwardedFor']);
        }


        let urlPath = `/user/info`;

        const response = await this.request({
            path: urlPath,
            method: 'POST',
            headers: headerParameters,
            query: queryParameters,
            body: UserInfoRequestToJSON(requestParameters['userInfoRequest']),
        }, initOverrides);

        return new runtime.JSONApiResponse(response, (jsonValue) => UserPublicInfoFromJSON(jsonValue));
    }

    /**
     * User Info
     */
    async userInfoUserInfoPost(requestParameters: UserInfoUserInfoPostRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<UserPublicInfo> {
        const response = await this.userInfoUserInfoPostRaw(requestParameters, initOverrides);
        return await response.value();
    }

}
