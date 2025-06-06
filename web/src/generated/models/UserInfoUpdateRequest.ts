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

import { mapValues } from '../runtime';
/**
 * 
 * @export
 * @interface UserInfoUpdateRequest
 */
export interface UserInfoUpdateRequest {
    /**
     * 
     * @type {string}
     * @memberof UserInfoUpdateRequest
     */
    nickname?: string | null;
    /**
     * 
     * @type {number}
     * @memberof UserInfoUpdateRequest
     */
    avatar_attachment_id?: number | null;
    /**
     * 
     * @type {string}
     * @memberof UserInfoUpdateRequest
     */
    slogan?: string | null;
}

/**
 * Check if a given object implements the UserInfoUpdateRequest interface.
 */
export function instanceOfUserInfoUpdateRequest(value: object): value is UserInfoUpdateRequest {
    return true;
}

export function UserInfoUpdateRequestFromJSON(json: any): UserInfoUpdateRequest {
    return UserInfoUpdateRequestFromJSONTyped(json, false);
}

export function UserInfoUpdateRequestFromJSONTyped(json: any, ignoreDiscriminator: boolean): UserInfoUpdateRequest {
    if (json == null) {
        return json;
    }
    return {
        
        'nickname': json['nickname'] == null ? undefined : json['nickname'],
        'avatar_attachment_id': json['avatar_attachment_id'] == null ? undefined : json['avatar_attachment_id'],
        'slogan': json['slogan'] == null ? undefined : json['slogan'],
    };
}

export function UserInfoUpdateRequestToJSON(json: any): UserInfoUpdateRequest {
    return UserInfoUpdateRequestToJSONTyped(json, false);
}

export function UserInfoUpdateRequestToJSONTyped(value?: UserInfoUpdateRequest | null, ignoreDiscriminator: boolean = false): any {
    if (value == null) {
        return value;
    }

    return {
        
        'nickname': value['nickname'],
        'avatar_attachment_id': value['avatar_attachment_id'],
        'slogan': value['slogan'],
    };
}

