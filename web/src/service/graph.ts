import graphApi from '@/api/graph'
import { DocumentGraphRequest, SectionGraphRequest, GraphResponse } from '@/generated'
import { request } from '@/lib/request'

export const searchGraph = async (): Promise<GraphResponse> => {
    return await request(graphApi.searchGraph)
}

export const searchDocumentGraph = async (data: DocumentGraphRequest): Promise<GraphResponse> => {
    return await request(graphApi.searchDocumentGraph, {
        data
    })
}

export const searchSectionGraph = async (data: SectionGraphRequest): Promise<GraphResponse> => {
    return await request(graphApi.searchSectionGraph, {
        data
    })
}

export const searchSectionGraphSEO = async (data: SectionGraphRequest): Promise<GraphResponse> => {
    return await request(graphApi.searchSectionGraphSEO, {
        data
    })
}
