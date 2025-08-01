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
 * @interface S3PresignUploadURLRequest
 */
export interface S3PresignUploadURLRequest {
    /**
     * 
     * @type {string}
     * @memberof S3PresignUploadURLRequest
     */
    file_path: string;
    /**
     * 
     * @type {string}
     * @memberof S3PresignUploadURLRequest
     */
    content_type: string;
}

/**
 * Check if a given object implements the S3PresignUploadURLRequest interface.
 */
export function instanceOfS3PresignUploadURLRequest(value: object): value is S3PresignUploadURLRequest {
    if (!('file_path' in value) || value['file_path'] === undefined) return false;
    if (!('content_type' in value) || value['content_type'] === undefined) return false;
    return true;
}

export function S3PresignUploadURLRequestFromJSON(json: any): S3PresignUploadURLRequest {
    return S3PresignUploadURLRequestFromJSONTyped(json, false);
}

export function S3PresignUploadURLRequestFromJSONTyped(json: any, ignoreDiscriminator: boolean): S3PresignUploadURLRequest {
    if (json == null) {
        return json;
    }
    return {
        
        'file_path': json['file_path'],
        'content_type': json['content_type'],
    };
}

export function S3PresignUploadURLRequestToJSON(json: any): S3PresignUploadURLRequest {
    return S3PresignUploadURLRequestToJSONTyped(json, false);
}

export function S3PresignUploadURLRequestToJSONTyped(value?: S3PresignUploadURLRequest | null, ignoreDiscriminator: boolean = false): any {
    if (value == null) {
        return value;
    }

    return {
        
        'file_path': value['file_path'],
        'content_type': value['content_type'],
    };
}

