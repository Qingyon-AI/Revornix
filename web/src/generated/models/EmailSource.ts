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
 * @interface EmailSource
 */
export interface EmailSource {
    /**
     * 
     * @type {number}
     * @memberof EmailSource
     */
    id: number;
    /**
     * 
     * @type {string}
     * @memberof EmailSource
     */
    email: string;
    /**
     * 
     * @type {string}
     * @memberof EmailSource
     */
    description: string;
    /**
     * 
     * @type {string}
     * @memberof EmailSource
     */
    password: string;
    /**
     * 
     * @type {Date}
     * @memberof EmailSource
     */
    create_time?: Date | null;
    /**
     * 
     * @type {Date}
     * @memberof EmailSource
     */
    update_time?: Date | null;
}

/**
 * Check if a given object implements the EmailSource interface.
 */
export function instanceOfEmailSource(value: object): value is EmailSource {
    if (!('id' in value) || value['id'] === undefined) return false;
    if (!('email' in value) || value['email'] === undefined) return false;
    if (!('description' in value) || value['description'] === undefined) return false;
    if (!('password' in value) || value['password'] === undefined) return false;
    return true;
}

export function EmailSourceFromJSON(json: any): EmailSource {
    return EmailSourceFromJSONTyped(json, false);
}

export function EmailSourceFromJSONTyped(json: any, ignoreDiscriminator: boolean): EmailSource {
    if (json == null) {
        return json;
    }
    return {
        
        'id': json['id'],
        'email': json['email'],
        'description': json['description'],
        'password': json['password'],
        'create_time': json['create_time'] == null ? undefined : (new Date(json['create_time'])),
        'update_time': json['update_time'] == null ? undefined : (new Date(json['update_time'])),
    };
}

export function EmailSourceToJSON(json: any): EmailSource {
    return EmailSourceToJSONTyped(json, false);
}

export function EmailSourceToJSONTyped(value?: EmailSource | null, ignoreDiscriminator: boolean = false): any {
    if (value == null) {
        return value;
    }

    return {
        
        'id': value['id'],
        'email': value['email'],
        'description': value['description'],
        'password': value['password'],
        'create_time': value['create_time'] == null ? undefined : ((value['create_time'] as any).toISOString()),
        'update_time': value['update_time'] == null ? undefined : ((value['update_time'] as any).toISOString()),
    };
}

