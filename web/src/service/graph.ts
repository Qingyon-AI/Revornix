import graphApi from '@/api/graph'
import { DocumentGraphRequest, SectionGraphRequest, GraphResponse } from '@/generated'
import { request } from '@/lib/request'
import { publicRequest } from '@/lib/request-public'

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

export const searchPublicSectionGraph = async (data: SectionGraphRequest): Promise<GraphResponse> => {
    return await publicRequest(graphApi.searchSectionGraph, {
        data
    })
}

export const searchPublicDocumentGraph = async (data: DocumentGraphRequest): Promise<GraphResponse> => {
    return await publicRequest(graphApi.searchDocumentGraph, {
        data
    })
}
