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
import type { SectionCommentInfo } from './SectionCommentInfo';
import {
    SectionCommentInfoFromJSON,
    SectionCommentInfoFromJSONTyped,
    SectionCommentInfoToJSON,
    SectionCommentInfoToJSONTyped,
} from './SectionCommentInfo';

/**
 * 
 * @export
 * @interface InifiniteScrollPagnitionSectionCommentInfo
 */
export interface InifiniteScrollPagnitionSectionCommentInfo {
    /**
     * 
     * @type {number}
     * @memberof InifiniteScrollPagnitionSectionCommentInfo
     */
    total: number;
    /**
     * 
     * @type {number}
     * @memberof InifiniteScrollPagnitionSectionCommentInfo
     */
    start?: number | null;
    /**
     * 
     * @type {number}
     * @memberof InifiniteScrollPagnitionSectionCommentInfo
     */
    limit: number;
    /**
     * 
     * @type {boolean}
     * @memberof InifiniteScrollPagnitionSectionCommentInfo
     */
    has_more: boolean;
    /**
     * 
     * @type {Array<SectionCommentInfo>}
     * @memberof InifiniteScrollPagnitionSectionCommentInfo
     */
    elements: Array<SectionCommentInfo>;
    /**
     * 
     * @type {number}
     * @memberof InifiniteScrollPagnitionSectionCommentInfo
     */
    next_start?: number | null;
}

/**
 * Check if a given object implements the InifiniteScrollPagnitionSectionCommentInfo interface.
 */
export function instanceOfInifiniteScrollPagnitionSectionCommentInfo(value: object): value is InifiniteScrollPagnitionSectionCommentInfo {
    if (!('total' in value) || value['total'] === undefined) return false;
    if (!('limit' in value) || value['limit'] === undefined) return false;
    if (!('has_more' in value) || value['has_more'] === undefined) return false;
    if (!('elements' in value) || value['elements'] === undefined) return false;
    return true;
}

export function InifiniteScrollPagnitionSectionCommentInfoFromJSON(json: any): InifiniteScrollPagnitionSectionCommentInfo {
    return InifiniteScrollPagnitionSectionCommentInfoFromJSONTyped(json, false);
}

export function InifiniteScrollPagnitionSectionCommentInfoFromJSONTyped(json: any, ignoreDiscriminator: boolean): InifiniteScrollPagnitionSectionCommentInfo {
    if (json == null) {
        return json;
    }
    return {
        
        'total': json['total'],
        'start': json['start'] == null ? undefined : json['start'],
        'limit': json['limit'],
        'has_more': json['has_more'],
        'elements': ((json['elements'] as Array<any>).map(SectionCommentInfoFromJSON)),
        'next_start': json['next_start'] == null ? undefined : json['next_start'],
    };
}

export function InifiniteScrollPagnitionSectionCommentInfoToJSON(json: any): InifiniteScrollPagnitionSectionCommentInfo {
    return InifiniteScrollPagnitionSectionCommentInfoToJSONTyped(json, false);
}

export function InifiniteScrollPagnitionSectionCommentInfoToJSONTyped(value?: InifiniteScrollPagnitionSectionCommentInfo | null, ignoreDiscriminator: boolean = false): any {
    if (value == null) {
        return value;
    }

    return {
        
        'total': value['total'],
        'start': value['start'],
        'limit': value['limit'],
        'has_more': value['has_more'],
        'elements': ((value['elements'] as Array<any>).map(SectionCommentInfoToJSON)),
        'next_start': value['next_start'],
    };
}

