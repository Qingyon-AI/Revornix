import engineApi from '@/api/engine'
import { CommunityEngineSearchRequest, EngineCreateRequest, EngineDeleteRequest, EngineDetail, EngineDetailRequest, EngineForkRequest, EngineProvidedSearchRequest, EngineProvidedSearchResponse, EngineUpdateRequest, InifiniteScrollPagnitionEngineInfo, NormalResponse, UsableEngineSearchRequest, UsableEnginesResponse } from '@/generated'
import { request } from '@/lib/request'

export type BillingAuditIssueDTO = {
    code: string
    severity: string
    resource_id: number
    resource_uuid: string
    resource_name: string
    provider_name?: string | null
    title: string
    description: string
}

export type GenerateImageWithDefaultEngineRequest = {
    prompt: string
    engine_id?: number
}

export type GenerateImageWithDefaultEngineResponse = {
    success: boolean
    message: string
    code: number
    prompt: string
    image_markdown: string
    data_url: string
}

export const getEngineDetail = async (data: EngineDetailRequest): Promise<EngineDetail> => {
    return await request(engineApi.getEngineDetail, {
        data
    })
}

export const getProvidedEngines = async (data: EngineProvidedSearchRequest): Promise<EngineProvidedSearchResponse> => {
    return await request(engineApi.getProvidedEngines, {
        data
    })
}

export const searchUableEngines = async (data: UsableEngineSearchRequest): Promise<UsableEnginesResponse> => {
    return await request(engineApi.searchUsableEngines, {
        data
    })
}

export const searchCommunityEngines = async (data: CommunityEngineSearchRequest): Promise<InifiniteScrollPagnitionEngineInfo> => {
    return await request(engineApi.searchCommunityEngines, {
        data
    })
}

export const forkEngine = async (data: EngineForkRequest): Promise<NormalResponse> => {
    return await request(engineApi.forkEngine, {
        data
    })
}

export const createEngine = async (data: EngineCreateRequest): Promise<NormalResponse> => {
    return await request(engineApi.createEngine, {
        data
    })
}

export const updateEngine = async (data: EngineUpdateRequest): Promise<NormalResponse> => {
    return await request(engineApi.updateEngine, {
        data
    })
}

export const deleteEngine = async (data: EngineDeleteRequest): Promise<NormalResponse> => {
    return await request(engineApi.deleteEngine, {
        data
    })
}

export const getEngineBillingAudit = async (): Promise<{ items: BillingAuditIssueDTO[] }> => {
    return await request(engineApi.getEngineBillingAudit)
}

export const generateImageWithDefaultEngine = async (
    data: GenerateImageWithDefaultEngineRequest,
): Promise<GenerateImageWithDefaultEngineResponse> => {
    return await request(engineApi.generateImageWithDefaultEngine, {
        data,
    })
}
