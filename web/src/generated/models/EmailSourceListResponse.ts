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
import type { EmailSource } from './EmailSource';
import {
    EmailSourceFromJSON,
    EmailSourceFromJSONTyped,
    EmailSourceToJSON,
    EmailSourceToJSONTyped,
} from './EmailSource';

/**
 * 
 * @export
 * @interface EmailSourceListResponse
 */
export interface EmailSourceListResponse {
    /**
     * 
     * @type {Array<EmailSource>}
     * @memberof EmailSourceListResponse
     */
    data: Array<EmailSource>;
}

/**
 * Check if a given object implements the EmailSourceListResponse interface.
 */
export function instanceOfEmailSourceListResponse(value: object): value is EmailSourceListResponse {
    if (!('data' in value) || value['data'] === undefined) return false;
    return true;
}

export function EmailSourceListResponseFromJSON(json: any): EmailSourceListResponse {
    return EmailSourceListResponseFromJSONTyped(json, false);
}

export function EmailSourceListResponseFromJSONTyped(json: any, ignoreDiscriminator: boolean): EmailSourceListResponse {
    if (json == null) {
        return json;
    }
    return {
        
        'data': ((json['data'] as Array<any>).map(EmailSourceFromJSON)),
    };
}

export function EmailSourceListResponseToJSON(json: any): EmailSourceListResponse {
    return EmailSourceListResponseToJSONTyped(json, false);
}

export function EmailSourceListResponseToJSONTyped(value?: EmailSourceListResponse | null, ignoreDiscriminator: boolean = false): any {
    if (value == null) {
        return value;
    }

    return {
        
        'data': ((value['data'] as Array<any>).map(EmailSourceToJSON)),
    };
}

