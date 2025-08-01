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
 * @interface PresignUploadURLResponse
 */
export interface PresignUploadURLResponse {
    /**
     * 
     * @type {string}
     * @memberof PresignUploadURLResponse
     */
    upload_url: string;
    /**
     * 
     * @type {string}
     * @memberof PresignUploadURLResponse
     */
    file_path: string;
    /**
     * 
     * @type {object}
     * @memberof PresignUploadURLResponse
     */
    fields: object;
}

/**
 * Check if a given object implements the PresignUploadURLResponse interface.
 */
export function instanceOfPresignUploadURLResponse(value: object): value is PresignUploadURLResponse {
    if (!('upload_url' in value) || value['upload_url'] === undefined) return false;
    if (!('file_path' in value) || value['file_path'] === undefined) return false;
    if (!('fields' in value) || value['fields'] === undefined) return false;
    return true;
}

export function PresignUploadURLResponseFromJSON(json: any): PresignUploadURLResponse {
    return PresignUploadURLResponseFromJSONTyped(json, false);
}

export function PresignUploadURLResponseFromJSONTyped(json: any, ignoreDiscriminator: boolean): PresignUploadURLResponse {
    if (json == null) {
        return json;
    }
    return {
        
        'upload_url': json['upload_url'],
        'file_path': json['file_path'],
        'fields': json['fields'],
    };
}

export function PresignUploadURLResponseToJSON(json: any): PresignUploadURLResponse {
    return PresignUploadURLResponseToJSONTyped(json, false);
}

export function PresignUploadURLResponseToJSONTyped(value?: PresignUploadURLResponse | null, ignoreDiscriminator: boolean = false): any {
    if (value == null) {
        return value;
    }

    return {
        
        'upload_url': value['upload_url'],
        'file_path': value['file_path'],
        'fields': value['fields'],
    };
}

