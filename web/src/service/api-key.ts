import apiKeyApi from '@/api/api_key'
import { ApiKeyCreateRequest, ApiKeyCreateResponse, ApiKeyUpdateRequest, ApiKeysDeleteRequest, NormalResponse, PaginationApiKeyInfo, SearchApiKeysRequest } from '@/generated'
import { request } from '@/lib/request'

export const createApiKey = async (data: ApiKeyCreateRequest): Promise<ApiKeyCreateResponse> => {
    return await request(apiKeyApi.createApiKey, {
        data
    })
}

export const updateApiKey = async (data: ApiKeyUpdateRequest): Promise<NormalResponse> => {
    return await request(apiKeyApi.updateApiKey, {
        data
    })
}

export const deleteApiKeys = async (data: ApiKeysDeleteRequest): Promise<NormalResponse> => {
    return await request(apiKeyApi.deleteApiKey, {
        data
    })
}

export const searchApiKey = async (data: SearchApiKeysRequest): Promise<PaginationApiKeyInfo> => {
    return await request(apiKeyApi.searchApiKey, {
        data
    })
}