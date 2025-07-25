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
 * @interface FileSystemUpdateRequest
 */
export interface FileSystemUpdateRequest {
    /**
     * 
     * @type {number}
     * @memberof FileSystemUpdateRequest
     */
    file_system_id: number;
    /**
     * 
     * @type {string}
     * @memberof FileSystemUpdateRequest
     */
    config_json: string;
}

/**
 * Check if a given object implements the FileSystemUpdateRequest interface.
 */
export function instanceOfFileSystemUpdateRequest(value: object): value is FileSystemUpdateRequest {
    if (!('file_system_id' in value) || value['file_system_id'] === undefined) return false;
    if (!('config_json' in value) || value['config_json'] === undefined) return false;
    return true;
}

export function FileSystemUpdateRequestFromJSON(json: any): FileSystemUpdateRequest {
    return FileSystemUpdateRequestFromJSONTyped(json, false);
}

export function FileSystemUpdateRequestFromJSONTyped(json: any, ignoreDiscriminator: boolean): FileSystemUpdateRequest {
    if (json == null) {
        return json;
    }
    return {
        
        'file_system_id': json['file_system_id'],
        'config_json': json['config_json'],
    };
}

export function FileSystemUpdateRequestToJSON(json: any): FileSystemUpdateRequest {
    return FileSystemUpdateRequestToJSONTyped(json, false);
}

export function FileSystemUpdateRequestToJSONTyped(value?: FileSystemUpdateRequest | null, ignoreDiscriminator: boolean = false): any {
    if (value == null) {
        return value;
    }

    return {
        
        'file_system_id': value['file_system_id'],
        'config_json': value['config_json'],
    };
}

