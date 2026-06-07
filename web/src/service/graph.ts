import graphApi from '@/api/graph'
import { DocumentGraphRequest, SectionGraphRequest, GraphResponse } from '@/generated'
import { request } from '@/lib/request'
import { serverRequest } from '@/lib/request-server'

export type GraphMode = 'knowledge' | 'document'

export const searchGraph = async (data?: { mode?: GraphMode }): Promise<GraphResponse> => {
    return await request(graphApi.searchGraph, {
        data: data ?? {}
    })
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

// --- SSR helpers ---

export const searchSectionGraphServer = async (
    data: SectionGraphRequest,
): Promise<GraphResponse> => {
    return await serverRequest(graphApi.searchSectionGraph, { data })
}

export const searchDocumentGraphServer = async (
    data: DocumentGraphRequest,
): Promise<GraphResponse> => {
    return await serverRequest(graphApi.searchDocumentGraph, { data })
}
