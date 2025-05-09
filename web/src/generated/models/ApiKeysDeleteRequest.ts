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
 * @interface ApiKeysDeleteRequest
 */
export interface ApiKeysDeleteRequest {
    /**
     * 
     * @type {Array<number>}
     * @memberof ApiKeysDeleteRequest
     */
    api_key_ids: Array<number>;
}

/**
 * Check if a given object implements the ApiKeysDeleteRequest interface.
 */
export function instanceOfApiKeysDeleteRequest(value: object): value is ApiKeysDeleteRequest {
    if (!('api_key_ids' in value) || value['api_key_ids'] === undefined) return false;
    return true;
}

export function ApiKeysDeleteRequestFromJSON(json: any): ApiKeysDeleteRequest {
    return ApiKeysDeleteRequestFromJSONTyped(json, false);
}

export function ApiKeysDeleteRequestFromJSONTyped(json: any, ignoreDiscriminator: boolean): ApiKeysDeleteRequest {
    if (json == null) {
        return json;
    }
    return {
        
        'api_key_ids': json['api_key_ids'],
    };
}

export function ApiKeysDeleteRequestToJSON(json: any): ApiKeysDeleteRequest {
    return ApiKeysDeleteRequestToJSONTyped(json, false);
}

export function ApiKeysDeleteRequestToJSONTyped(value?: ApiKeysDeleteRequest | null, ignoreDiscriminator: boolean = false): any {
    if (value == null) {
        return value;
    }

    return {
        
        'api_key_ids': value['api_key_ids'],
    };
}

