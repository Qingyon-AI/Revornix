import engineApi from '@/api/engine'
import { EngineSearchRequest, EngineSearchResponse } from '@/generated'
import { request } from '@/lib/request'

export const getDocumentParseEngines = async (data: EngineSearchRequest): Promise<EngineSearchResponse> => {
    return await request(engineApi.getDocumentParseEngines, {
        data
    })
}

export const getWebsiteCrawlEngines = async (data: EngineSearchRequest): Promise<EngineSearchResponse> => {
    return await request(engineApi.getWebsiteCrawlEngines, {
        data
    })
}