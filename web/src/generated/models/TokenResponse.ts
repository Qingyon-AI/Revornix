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
 * @interface TokenResponse
 */
export interface TokenResponse {
    /**
     * 
     * @type {string}
     * @memberof TokenResponse
     */
    access_token: string;
    /**
     * 
     * @type {string}
     * @memberof TokenResponse
     */
    refresh_token: string;
    /**
     * 
     * @type {number}
     * @memberof TokenResponse
     */
    expires_in: number;
}

/**
 * Check if a given object implements the TokenResponse interface.
 */
export function instanceOfTokenResponse(value: object): value is TokenResponse {
    if (!('access_token' in value) || value['access_token'] === undefined) return false;
    if (!('refresh_token' in value) || value['refresh_token'] === undefined) return false;
    if (!('expires_in' in value) || value['expires_in'] === undefined) return false;
    return true;
}

export function TokenResponseFromJSON(json: any): TokenResponse {
    return TokenResponseFromJSONTyped(json, false);
}

export function TokenResponseFromJSONTyped(json: any, ignoreDiscriminator: boolean): TokenResponse {
    if (json == null) {
        return json;
    }
    return {
        
        'access_token': json['access_token'],
        'refresh_token': json['refresh_token'],
        'expires_in': json['expires_in'],
    };
}

export function TokenResponseToJSON(json: any): TokenResponse {
    return TokenResponseToJSONTyped(json, false);
}

export function TokenResponseToJSONTyped(value?: TokenResponse | null, ignoreDiscriminator: boolean = false): any {
    if (value == null) {
        return value;
    }

    return {
        
        'access_token': value['access_token'],
        'refresh_token': value['refresh_token'],
        'expires_in': value['expires_in'],
    };
}

