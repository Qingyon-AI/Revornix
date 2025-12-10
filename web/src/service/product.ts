import ProductApi from '@/api/product'
import { request } from '@/lib/request'

interface Ability {
    id: number
    name: string
    name_zh: string
    description: string
    description_zh: string
    tag: string
    create_time: string
    update_time: string
    delete_at: string
}

interface ProductAbilitiesResponse {
    abilities: Ability[]
}

export const getProductAbilities = async (
    data: {
        product_uuid: string
    }
): Promise<ProductAbilitiesResponse> => {
    return await request(ProductApi.getProductAbilities, {
        data
    })
}

interface ProductDetailResponse {
    id: number
    uuid: string
    name: string
    name_zh: string
    description: string
    description_zh: string
    price: number
}

export const getProductDetail = async (
    data: {
        product_uuid: string
    }
): Promise<ProductDetailResponse> => {
    return await request(ProductApi.getProductDetail, {
        data
    })
}

export type PrePayResponse = {
    out_trade_no: string
    code: string
    product_name: string
    price: number
}

export const prePayProduct = async (
    data: {
        product_uuid: string;
        pay_way: number;
        category: string;
    }
): Promise<PrePayResponse> => {
    return await request(ProductApi.prePayProduct, {
        data
    })
}