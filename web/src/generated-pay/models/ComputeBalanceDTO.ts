/* tslint:disable */
/* eslint-disable */

export interface ComputeBalanceDTO {
    available_points: number;
    gifted_points: number;
    purchased_points: number;
    consumed_points: number;
}

export function instanceOfComputeBalanceDTO(value: object): value is ComputeBalanceDTO {
    if (!('available_points' in value) || value['available_points'] === undefined) return false;
    if (!('gifted_points' in value) || value['gifted_points'] === undefined) return false;
    if (!('purchased_points' in value) || value['purchased_points'] === undefined) return false;
    if (!('consumed_points' in value) || value['consumed_points'] === undefined) return false;
    return true;
}

export function ComputeBalanceDTOFromJSON(json: any): ComputeBalanceDTO {
    if (json == null) {
        return json;
    }
    return {
        'available_points': json['available_points'],
        'gifted_points': json['gifted_points'],
        'purchased_points': json['purchased_points'],
        'consumed_points': json['consumed_points'],
    };
}

export function ComputeBalanceDTOToJSON(value?: ComputeBalanceDTO | null): any {
    if (value == null) {
        return value;
    }
    return {
        'available_points': value['available_points'],
        'gifted_points': value['gifted_points'],
        'purchased_points': value['purchased_points'],
        'consumed_points': value['consumed_points'],
    };
}
