import ProductApi from '@/api/product'
import { GetProductAbilitiesRequestDTO, GetProductAbilitiesResponseDTO, GetProductRequestByUUIDDTO, GetProductResponseDTO, PrePayProductRequestDTO, PrePayProductResponseDTO } from '@/generated-pay'
import { request } from '@/lib/request'

export const getProductAbilities = async (
    data: GetProductAbilitiesRequestDTO
): Promise<GetProductAbilitiesResponseDTO> => {
    return await request(ProductApi.getProductAbilities, {
        data
    })
}

export const getProductDetail = async (
    data: GetProductRequestByUUIDDTO
): Promise<GetProductResponseDTO> => {
    return await request(ProductApi.getProductDetail, {
        data
    })
}

export const prePayProduct = async (
    data: PrePayProductRequestDTO
): Promise<PrePayProductResponseDTO> => {
    return await request(ProductApi.prePayProduct, {
        data
    })
}