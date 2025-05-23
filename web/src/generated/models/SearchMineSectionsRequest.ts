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
 * @interface SearchMineSectionsRequest
 */
export interface SearchMineSectionsRequest {
    /**
     * 
     * @type {string}
     * @memberof SearchMineSectionsRequest
     */
    keyword?: string | null;
    /**
     * 
     * @type {number}
     * @memberof SearchMineSectionsRequest
     */
    start?: number | null;
    /**
     * 
     * @type {number}
     * @memberof SearchMineSectionsRequest
     */
    limit?: number;
    /**
     * 
     * @type {Array<number>}
     * @memberof SearchMineSectionsRequest
     */
    label_ids?: Array<number> | null;
    /**
     * 
     * @type {boolean}
     * @memberof SearchMineSectionsRequest
     */
    desc?: boolean | null;
}

/**
 * Check if a given object implements the SearchMineSectionsRequest interface.
 */
export function instanceOfSearchMineSectionsRequest(value: object): value is SearchMineSectionsRequest {
    return true;
}

export function SearchMineSectionsRequestFromJSON(json: any): SearchMineSectionsRequest {
    return SearchMineSectionsRequestFromJSONTyped(json, false);
}

export function SearchMineSectionsRequestFromJSONTyped(json: any, ignoreDiscriminator: boolean): SearchMineSectionsRequest {
    if (json == null) {
        return json;
    }
    return {
        
        'keyword': json['keyword'] == null ? undefined : json['keyword'],
        'start': json['start'] == null ? undefined : json['start'],
        'limit': json['limit'] == null ? undefined : json['limit'],
        'label_ids': json['label_ids'] == null ? undefined : json['label_ids'],
        'desc': json['desc'] == null ? undefined : json['desc'],
    };
}

export function SearchMineSectionsRequestToJSON(json: any): SearchMineSectionsRequest {
    return SearchMineSectionsRequestToJSONTyped(json, false);
}

export function SearchMineSectionsRequestToJSONTyped(value?: SearchMineSectionsRequest | null, ignoreDiscriminator: boolean = false): any {
    if (value == null) {
        return value;
    }

    return {
        
        'keyword': value['keyword'],
        'start': value['start'],
        'limit': value['limit'],
        'label_ids': value['label_ids'],
        'desc': value['desc'],
    };
}

