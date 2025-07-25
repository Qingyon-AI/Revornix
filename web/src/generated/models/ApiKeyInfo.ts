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
 * @interface ApiKeyInfo
 */
export interface ApiKeyInfo {
    /**
     * 
     * @type {number}
     * @memberof ApiKeyInfo
     */
    id: number;
    /**
     * 
     * @type {string}
     * @memberof ApiKeyInfo
     */
    api_key: string;
    /**
     * 
     * @type {string}
     * @memberof ApiKeyInfo
     */
    description: string;
    /**
     * 
     * @type {Date}
     * @memberof ApiKeyInfo
     */
    create_time: Date;
    /**
     * 
     * @type {Date}
     * @memberof ApiKeyInfo
     */
    last_used_time?: Date | null;
}

/**
 * Check if a given object implements the ApiKeyInfo interface.
 */
export function instanceOfApiKeyInfo(value: object): value is ApiKeyInfo {
    if (!('id' in value) || value['id'] === undefined) return false;
    if (!('api_key' in value) || value['api_key'] === undefined) return false;
    if (!('description' in value) || value['description'] === undefined) return false;
    if (!('create_time' in value) || value['create_time'] === undefined) return false;
    return true;
}

export function ApiKeyInfoFromJSON(json: any): ApiKeyInfo {
    return ApiKeyInfoFromJSONTyped(json, false);
}

export function ApiKeyInfoFromJSONTyped(json: any, ignoreDiscriminator: boolean): ApiKeyInfo {
    if (json == null) {
        return json;
    }
    return {
        
        'id': json['id'],
        'api_key': json['api_key'],
        'description': json['description'],
        'create_time': (new Date(json['create_time'])),
        'last_used_time': json['last_used_time'] == null ? undefined : (new Date(json['last_used_time'])),
    };
}

export function ApiKeyInfoToJSON(json: any): ApiKeyInfo {
    return ApiKeyInfoToJSONTyped(json, false);
}

export function ApiKeyInfoToJSONTyped(value?: ApiKeyInfo | null, ignoreDiscriminator: boolean = false): any {
    if (value == null) {
        return value;
    }

    return {
        
        'id': value['id'],
        'api_key': value['api_key'],
        'description': value['description'],
        'create_time': ((value['create_time']).toISOString()),
        'last_used_time': value['last_used_time'] === null ? null : ((value['last_used_time'] as any)?.toISOString()),
    };
}

