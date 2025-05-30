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
import type { Notification } from './Notification';
import {
    NotificationFromJSON,
    NotificationFromJSONTyped,
    NotificationToJSON,
    NotificationToJSONTyped,
} from './Notification';

/**
 * 
 * @export
 * @interface InifiniteScrollPagnitionNotification
 */
export interface InifiniteScrollPagnitionNotification {
    /**
     * 
     * @type {number}
     * @memberof InifiniteScrollPagnitionNotification
     */
    total: number;
    /**
     * 
     * @type {number}
     * @memberof InifiniteScrollPagnitionNotification
     */
    start?: number | null;
    /**
     * 
     * @type {number}
     * @memberof InifiniteScrollPagnitionNotification
     */
    limit: number;
    /**
     * 
     * @type {boolean}
     * @memberof InifiniteScrollPagnitionNotification
     */
    has_more: boolean;
    /**
     * 
     * @type {Array<Notification>}
     * @memberof InifiniteScrollPagnitionNotification
     */
    elements: Array<Notification>;
    /**
     * 
     * @type {number}
     * @memberof InifiniteScrollPagnitionNotification
     */
    next_start?: number | null;
}

/**
 * Check if a given object implements the InifiniteScrollPagnitionNotification interface.
 */
export function instanceOfInifiniteScrollPagnitionNotification(value: object): value is InifiniteScrollPagnitionNotification {
    if (!('total' in value) || value['total'] === undefined) return false;
    if (!('limit' in value) || value['limit'] === undefined) return false;
    if (!('has_more' in value) || value['has_more'] === undefined) return false;
    if (!('elements' in value) || value['elements'] === undefined) return false;
    return true;
}

export function InifiniteScrollPagnitionNotificationFromJSON(json: any): InifiniteScrollPagnitionNotification {
    return InifiniteScrollPagnitionNotificationFromJSONTyped(json, false);
}

export function InifiniteScrollPagnitionNotificationFromJSONTyped(json: any, ignoreDiscriminator: boolean): InifiniteScrollPagnitionNotification {
    if (json == null) {
        return json;
    }
    return {
        
        'total': json['total'],
        'start': json['start'] == null ? undefined : json['start'],
        'limit': json['limit'],
        'has_more': json['has_more'],
        'elements': ((json['elements'] as Array<any>).map(NotificationFromJSON)),
        'next_start': json['next_start'] == null ? undefined : json['next_start'],
    };
}

export function InifiniteScrollPagnitionNotificationToJSON(json: any): InifiniteScrollPagnitionNotification {
    return InifiniteScrollPagnitionNotificationToJSONTyped(json, false);
}

export function InifiniteScrollPagnitionNotificationToJSONTyped(value?: InifiniteScrollPagnitionNotification | null, ignoreDiscriminator: boolean = false): any {
    if (value == null) {
        return value;
    }

    return {
        
        'total': value['total'],
        'start': value['start'],
        'limit': value['limit'],
        'has_more': value['has_more'],
        'elements': ((value['elements'] as Array<any>).map(NotificationToJSON)),
        'next_start': value['next_start'],
    };
}

