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
 * @interface DocumentNoteDeleteRequest
 */
export interface DocumentNoteDeleteRequest {
    /**
     * 
     * @type {Array<number>}
     * @memberof DocumentNoteDeleteRequest
     */
    document_note_ids: Array<number>;
}

/**
 * Check if a given object implements the DocumentNoteDeleteRequest interface.
 */
export function instanceOfDocumentNoteDeleteRequest(value: object): value is DocumentNoteDeleteRequest {
    if (!('document_note_ids' in value) || value['document_note_ids'] === undefined) return false;
    return true;
}

export function DocumentNoteDeleteRequestFromJSON(json: any): DocumentNoteDeleteRequest {
    return DocumentNoteDeleteRequestFromJSONTyped(json, false);
}

export function DocumentNoteDeleteRequestFromJSONTyped(json: any, ignoreDiscriminator: boolean): DocumentNoteDeleteRequest {
    if (json == null) {
        return json;
    }
    return {
        
        'document_note_ids': json['document_note_ids'],
    };
}

export function DocumentNoteDeleteRequestToJSON(json: any): DocumentNoteDeleteRequest {
    return DocumentNoteDeleteRequestToJSONTyped(json, false);
}

export function DocumentNoteDeleteRequestToJSONTyped(value?: DocumentNoteDeleteRequest | null, ignoreDiscriminator: boolean = false): any {
    if (value == null) {
        return value;
    }

    return {
        
        'document_note_ids': value['document_note_ids'],
    };
}

