import engineApi from '@/api/engine'
import { EngineDeleteRequest, EngineInstallRequest, EngineInstallResponse, EngineSearchRequest, EngineUpdateRequest, MineEngineSearchResponse, NormalResponse, ProvideEngineSearchResponse } from '@/generated'
import { request } from '@/lib/request'

export const getMineEngines = async (data: EngineSearchRequest): Promise<MineEngineSearchResponse> => {
    return await request(engineApi.getMineEngines, {
        data
    })
}

export const getProvideEngines = async (data: EngineSearchRequest): Promise<ProvideEngineSearchResponse> => {
    return await request(engineApi.getProvideEngines, {
        data
    })
}

export const installEngine = async (data: EngineInstallRequest): Promise<EngineInstallResponse> => {
    return await request(engineApi.installEngine, {
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