import aiApi from '@/api/ai'
import { ChatMessages, DeleteModelProviderRequest, DeleteModelRequest, Model, ModelCreateRequest, ModelProvider, ModelProviderCreateRequest, ModelProviderRequest, ModelProviderSearchRequest, ModelProviderUpdateRequest, ModelRequest, ModelSearchRequest, ModelSearchResponse, ModelUpdateRequest } from '@/generated'
import { request } from '@/lib/request'

export const askAi = async (data: ChatMessages) => {
    return await request(aiApi.askAi, {
        data: data
    })
}

export const createAiModel = async (data: ModelCreateRequest) => {
    return await request(aiApi.createAiModel, {
        data: data
    })
}

export const createAiModelProvider = async (data: ModelProviderCreateRequest) => {
    return await request(aiApi.createAiModelProvider, {
        data: data
    })
}

export const searchAiModel = async (data: ModelSearchRequest): Promise<ModelSearchResponse> => {
    return await request(aiApi.searchAiModel, {
        data: data
    })
}

export const searchAiModelProvider = async (data: ModelProviderSearchRequest): Promise<ModelSearchResponse> => {
    return await request(aiApi.searchAiModelProvider, {
        data: data
    })
}

export const deleteAiModel = async (data: DeleteModelRequest) => {
    return await request(aiApi.deleteAiModel, {
        data: data
    })
}

export const deleteAiModelProvider = async (data: DeleteModelProviderRequest) => {
    return await request(aiApi.deleteAiModelProvider, {
        data: data
    })
}

export const updateAiModel = async (data: ModelUpdateRequest) => {
    return await request(aiApi.updateAiModel, {
        data: data
    })
}

export const updateAiModelProvider = async (data: ModelProviderUpdateRequest) => {
    return await request(aiApi.updateAiModelProvider, {
        data: data
    })
}

export const getAiModel = async (data: ModelRequest): Promise<Model> => {
    return await request(aiApi.getAiModelDetail, {
        data: data
    })
}

export const getAiModelProvider = async (data: ModelProviderRequest): Promise<ModelProvider> => {
    return await request(aiApi.getAiModelProviderDetail, {
        data: data
    })
}