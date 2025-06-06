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
import type { SummaryItem } from './SummaryItem';
import {
    SummaryItemFromJSON,
    SummaryItemFromJSONTyped,
    SummaryItemToJSON,
    SummaryItemToJSONTyped,
} from './SummaryItem';

/**
 * 
 * @export
 * @interface DocumentMonthSummaryResponse
 */
export interface DocumentMonthSummaryResponse {
    /**
     * 
     * @type {Array<SummaryItem>}
     * @memberof DocumentMonthSummaryResponse
     */
    data: Array<SummaryItem>;
}

/**
 * Check if a given object implements the DocumentMonthSummaryResponse interface.
 */
export function instanceOfDocumentMonthSummaryResponse(value: object): value is DocumentMonthSummaryResponse {
    if (!('data' in value) || value['data'] === undefined) return false;
    return true;
}

export function DocumentMonthSummaryResponseFromJSON(json: any): DocumentMonthSummaryResponse {
    return DocumentMonthSummaryResponseFromJSONTyped(json, false);
}

export function DocumentMonthSummaryResponseFromJSONTyped(json: any, ignoreDiscriminator: boolean): DocumentMonthSummaryResponse {
    if (json == null) {
        return json;
    }
    return {
        
        'data': ((json['data'] as Array<any>).map(SummaryItemFromJSON)),
    };
}

export function DocumentMonthSummaryResponseToJSON(json: any): DocumentMonthSummaryResponse {
    return DocumentMonthSummaryResponseToJSONTyped(json, false);
}

export function DocumentMonthSummaryResponseToJSONTyped(value?: DocumentMonthSummaryResponse | null, ignoreDiscriminator: boolean = false): any {
    if (value == null) {
        return value;
    }

    return {
        
        'data': ((value['data'] as Array<any>).map(SummaryItemToJSON)),
    };
}

