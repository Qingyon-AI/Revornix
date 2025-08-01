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
 * @interface FileUrlPrefixResponse
 */
export interface FileUrlPrefixResponse {
    /**
     * 
     * @type {string}
     * @memberof FileUrlPrefixResponse
     */
    url_prefix: string;
}

/**
 * Check if a given object implements the FileUrlPrefixResponse interface.
 */
export function instanceOfFileUrlPrefixResponse(value: object): value is FileUrlPrefixResponse {
    if (!('url_prefix' in value) || value['url_prefix'] === undefined) return false;
    return true;
}

export function FileUrlPrefixResponseFromJSON(json: any): FileUrlPrefixResponse {
    return FileUrlPrefixResponseFromJSONTyped(json, false);
}

export function FileUrlPrefixResponseFromJSONTyped(json: any, ignoreDiscriminator: boolean): FileUrlPrefixResponse {
    if (json == null) {
        return json;
    }
    return {
        
        'url_prefix': json['url_prefix'],
    };
}

export function FileUrlPrefixResponseToJSON(json: any): FileUrlPrefixResponse {
    return FileUrlPrefixResponseToJSONTyped(json, false);
}

export function FileUrlPrefixResponseToJSONTyped(value?: FileUrlPrefixResponse | null, ignoreDiscriminator: boolean = false): any {
    if (value == null) {
        return value;
    }

    return {
        
        'url_prefix': value['url_prefix'],
    };
}

