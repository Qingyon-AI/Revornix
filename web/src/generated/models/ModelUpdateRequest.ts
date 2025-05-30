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
 * @interface ModelUpdateRequest
 */
export interface ModelUpdateRequest {
    /**
     * 
     * @type {number}
     * @memberof ModelUpdateRequest
     */
    id: number;
    /**
     * 
     * @type {string}
     * @memberof ModelUpdateRequest
     */
    name?: string | null;
    /**
     * 
     * @type {string}
     * @memberof ModelUpdateRequest
     */
    description?: string | null;
    /**
     * 
     * @type {string}
     * @memberof ModelUpdateRequest
     */
    api_key?: string | null;
    /**
     * 
     * @type {string}
     * @memberof ModelUpdateRequest
     */
    api_url?: string | null;
}

/**
 * Check if a given object implements the ModelUpdateRequest interface.
 */
export function instanceOfModelUpdateRequest(value: object): value is ModelUpdateRequest {
    if (!('id' in value) || value['id'] === undefined) return false;
    return true;
}

export function ModelUpdateRequestFromJSON(json: any): ModelUpdateRequest {
    return ModelUpdateRequestFromJSONTyped(json, false);
}

export function ModelUpdateRequestFromJSONTyped(json: any, ignoreDiscriminator: boolean): ModelUpdateRequest {
    if (json == null) {
        return json;
    }
    return {
        
        'id': json['id'],
        'name': json['name'] == null ? undefined : json['name'],
        'description': json['description'] == null ? undefined : json['description'],
        'api_key': json['api_key'] == null ? undefined : json['api_key'],
        'api_url': json['api_url'] == null ? undefined : json['api_url'],
    };
}

export function ModelUpdateRequestToJSON(json: any): ModelUpdateRequest {
    return ModelUpdateRequestToJSONTyped(json, false);
}

export function ModelUpdateRequestToJSONTyped(value?: ModelUpdateRequest | null, ignoreDiscriminator: boolean = false): any {
    if (value == null) {
        return value;
    }

    return {
        
        'id': value['id'],
        'name': value['name'],
        'description': value['description'],
        'api_key': value['api_key'],
        'api_url': value['api_url'],
    };
}

