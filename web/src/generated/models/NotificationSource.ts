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
 * @interface NotificationSource
 */
export interface NotificationSource {
    /**
     * 
     * @type {number}
     * @memberof NotificationSource
     */
    id: number;
    /**
     * 
     * @type {string}
     * @memberof NotificationSource
     */
    title: string;
    /**
     * 
     * @type {string}
     * @memberof NotificationSource
     */
    description: string;
    /**
     * 
     * @type {Date}
     * @memberof NotificationSource
     */
    create_time?: Date | null;
    /**
     * 
     * @type {Date}
     * @memberof NotificationSource
     */
    update_time?: Date | null;
}

/**
 * Check if a given object implements the NotificationSource interface.
 */
export function instanceOfNotificationSource(value: object): value is NotificationSource {
    if (!('id' in value) || value['id'] === undefined) return false;
    if (!('title' in value) || value['title'] === undefined) return false;
    if (!('description' in value) || value['description'] === undefined) return false;
    return true;
}

export function NotificationSourceFromJSON(json: any): NotificationSource {
    return NotificationSourceFromJSONTyped(json, false);
}

export function NotificationSourceFromJSONTyped(json: any, ignoreDiscriminator: boolean): NotificationSource {
    if (json == null) {
        return json;
    }
    return {
        
        'id': json['id'],
        'title': json['title'],
        'description': json['description'],
        'create_time': json['create_time'] == null ? undefined : (new Date(json['create_time'])),
        'update_time': json['update_time'] == null ? undefined : (new Date(json['update_time'])),
    };
}

export function NotificationSourceToJSON(json: any): NotificationSource {
    return NotificationSourceToJSONTyped(json, false);
}

export function NotificationSourceToJSONTyped(value?: NotificationSource | null, ignoreDiscriminator: boolean = false): any {
    if (value == null) {
        return value;
    }

    return {
        
        'id': value['id'],
        'title': value['title'],
        'description': value['description'],
        'create_time': value['create_time'] === null ? null : ((value['create_time'] as any)?.toISOString()),
        'update_time': value['update_time'] === null ? null : ((value['update_time'] as any)?.toISOString()),
    };
}

