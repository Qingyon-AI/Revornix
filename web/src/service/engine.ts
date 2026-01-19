import engineApi from '@/api/engine'
import { CommunityEngineSearchRequest, EngineCreateRequest, EngineDeleteRequest, EngineDetail, EngineDetailRequest, EngineForkRequest, EngineProvidedSearchRequest, EngineProvidedSearchResponse, EngineUpdateRequest, InifiniteScrollPagnitionEngineInfo, NormalResponse, UsableEngineSearchRequest, UsableEnginesResponse } from '@/generated'
import { request } from '@/lib/request'

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