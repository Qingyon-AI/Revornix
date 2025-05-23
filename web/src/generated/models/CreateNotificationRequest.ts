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
 * @interface CreateNotificationRequest
 */
export interface CreateNotificationRequest {
    /**
     * 
     * @type {string}
     * @memberof CreateNotificationRequest
     */
    title: string;
    /**
     * 
     * @type {string}
     * @memberof CreateNotificationRequest
     */
    content: string;
    /**
     * 
     * @type {string}
     * @memberof CreateNotificationRequest
     */
    link?: string | null;
    /**
     * 
     * @type {number}
     * @memberof CreateNotificationRequest
     */
    notification_type: number;
}

/**
 * Check if a given object implements the CreateNotificationRequest interface.
 */
export function instanceOfCreateNotificationRequest(value: object): value is CreateNotificationRequest {
    if (!('title' in value) || value['title'] === undefined) return false;
    if (!('content' in value) || value['content'] === undefined) return false;
    if (!('notification_type' in value) || value['notification_type'] === undefined) return false;
    return true;
}

export function CreateNotificationRequestFromJSON(json: any): CreateNotificationRequest {
    return CreateNotificationRequestFromJSONTyped(json, false);
}

export function CreateNotificationRequestFromJSONTyped(json: any, ignoreDiscriminator: boolean): CreateNotificationRequest {
    if (json == null) {
        return json;
    }
    return {
        
        'title': json['title'],
        'content': json['content'],
        'link': json['link'] == null ? undefined : json['link'],
        'notification_type': json['notification_type'],
    };
}

export function CreateNotificationRequestToJSON(json: any): CreateNotificationRequest {
    return CreateNotificationRequestToJSONTyped(json, false);
}

export function CreateNotificationRequestToJSONTyped(value?: CreateNotificationRequest | null, ignoreDiscriminator: boolean = false): any {
    if (value == null) {
        return value;
    }

    return {
        
        'title': value['title'],
        'content': value['content'],
        'link': value['link'],
        'notification_type': value['notification_type'],
    };
}

