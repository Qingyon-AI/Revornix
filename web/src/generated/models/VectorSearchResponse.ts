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
import type { DocumentInfo } from './DocumentInfo';
import {
    DocumentInfoFromJSON,
    DocumentInfoFromJSONTyped,
    DocumentInfoToJSON,
    DocumentInfoToJSONTyped,
} from './DocumentInfo';

/**
 * 
 * @export
 * @interface VectorSearchResponse
 */
export interface VectorSearchResponse {
    /**
     * 
     * @type {Array<DocumentInfo>}
     * @memberof VectorSearchResponse
     */
    documents: Array<DocumentInfo>;
}

/**
 * Check if a given object implements the VectorSearchResponse interface.
 */
export function instanceOfVectorSearchResponse(value: object): value is VectorSearchResponse {
    if (!('documents' in value) || value['documents'] === undefined) return false;
    return true;
}

export function VectorSearchResponseFromJSON(json: any): VectorSearchResponse {
    return VectorSearchResponseFromJSONTyped(json, false);
}

export function VectorSearchResponseFromJSONTyped(json: any, ignoreDiscriminator: boolean): VectorSearchResponse {
    if (json == null) {
        return json;
    }
    return {
        
        'documents': ((json['documents'] as Array<any>).map(DocumentInfoFromJSON)),
    };
}

export function VectorSearchResponseToJSON(json: any): VectorSearchResponse {
    return VectorSearchResponseToJSONTyped(json, false);
}

export function VectorSearchResponseToJSONTyped(value?: VectorSearchResponse | null, ignoreDiscriminator: boolean = false): any {
    if (value == null) {
        return value;
    }

    return {
        
        'documents': ((value['documents'] as Array<any>).map(DocumentInfoToJSON)),
    };
}

