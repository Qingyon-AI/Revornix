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
 * @interface AliyunOSSPresignUploadURLRequest
 */
export interface AliyunOSSPresignUploadURLRequest {
    /**
     * 
     * @type {string}
     * @memberof AliyunOSSPresignUploadURLRequest
     */
    file_path: string;
    /**
     * 
     * @type {string}
     * @memberof AliyunOSSPresignUploadURLRequest
     */
    content_type: string;
}

/**
 * Check if a given object implements the AliyunOSSPresignUploadURLRequest interface.
 */
export function instanceOfAliyunOSSPresignUploadURLRequest(value: object): value is AliyunOSSPresignUploadURLRequest {
    if (!('file_path' in value) || value['file_path'] === undefined) return false;
    if (!('content_type' in value) || value['content_type'] === undefined) return false;
    return true;
}

export function AliyunOSSPresignUploadURLRequestFromJSON(json: any): AliyunOSSPresignUploadURLRequest {
    return AliyunOSSPresignUploadURLRequestFromJSONTyped(json, false);
}

export function AliyunOSSPresignUploadURLRequestFromJSONTyped(json: any, ignoreDiscriminator: boolean): AliyunOSSPresignUploadURLRequest {
    if (json == null) {
        return json;
    }
    return {
        
        'file_path': json['file_path'],
        'content_type': json['content_type'],
    };
}

export function AliyunOSSPresignUploadURLRequestToJSON(json: any): AliyunOSSPresignUploadURLRequest {
    return AliyunOSSPresignUploadURLRequestToJSONTyped(json, false);
}

export function AliyunOSSPresignUploadURLRequestToJSONTyped(value?: AliyunOSSPresignUploadURLRequest | null, ignoreDiscriminator: boolean = false): any {
    if (value == null) {
        return value;
    }

    return {
        
        'file_path': value['file_path'],
        'content_type': value['content_type'],
    };
}

