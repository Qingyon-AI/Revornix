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
 * @interface CoverImage
 */
export interface CoverImage {
    /**
     * 
     * @type {string}
     * @memberof CoverImage
     */
    url: string;
    /**
     * 
     * @type {number}
     * @memberof CoverImage
     */
    width: number;
    /**
     * 
     * @type {number}
     * @memberof CoverImage
     */
    height: number;
}

/**
 * Check if a given object implements the CoverImage interface.
 */
export function instanceOfCoverImage(value: object): value is CoverImage {
    if (!('url' in value) || value['url'] === undefined) return false;
    if (!('width' in value) || value['width'] === undefined) return false;
    if (!('height' in value) || value['height'] === undefined) return false;
    return true;
}

export function CoverImageFromJSON(json: any): CoverImage {
    return CoverImageFromJSONTyped(json, false);
}

export function CoverImageFromJSONTyped(json: any, ignoreDiscriminator: boolean): CoverImage {
    if (json == null) {
        return json;
    }
    return {
        
        'url': json['url'],
        'width': json['width'],
        'height': json['height'],
    };
}

export function CoverImageToJSON(json: any): CoverImage {
    return CoverImageToJSONTyped(json, false);
}

export function CoverImageToJSONTyped(value?: CoverImage | null, ignoreDiscriminator: boolean = false): any {
    if (value == null) {
        return value;
    }

    return {
        
        'url': value['url'],
        'width': value['width'],
        'height': value['height'],
    };
}

