import engineApi from '@/api/engine'
import { EngineInstallRequest, EngineSearchRequest, EngineSearchResponse, EngineUpdateRequest, NormalResponse } from '@/generated'
import { request } from '@/lib/request'

export const getMineEngines = async (data: EngineSearchRequest): Promise<EngineSearchResponse> => {
    return await request(engineApi.getMineEngines, {
        data
    })
}

export const getProvideEngines = async (data: EngineSearchRequest): Promise<EngineSearchResponse> => {
    return await request(engineApi.getProvideEngines, {
        data
    })
}

export const installEngine = async (data: EngineInstallRequest): Promise<NormalResponse> => {
    return await request(engineApi.installEngine, {
        data
    })
}

export const updateEngine = async (data: EngineUpdateRequest): Promise<NormalResponse> => {
    return await request(engineApi.updateEngine, {
        data
    })
}