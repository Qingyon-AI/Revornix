import documentApi from '@/api/document'
import { InifiniteScrollPagnitionDocumentInfo, DocumentDetailResponse, NormalResponse, ReadRequest, StarRequest, DocumentDeleteRequest, DocumentCreateRequest, DocumentCreateResponse, SearchAllMyDocumentsRequest, SearchMyStarDocumentsRequest, SearchRecentReadRequest, VectorSearchRequest, VectorSearchResponse, DocumentMonthSummaryResponse, DocumentNoteCreateRequest, DocumentNoteDeleteRequest, InifiniteScrollPagnitionDocumentNoteInfo, SearchDocumentNoteRequest, DocumentAiSummaryRequest, SearchUnreadListRequest, LabelSummaryResponse, DocumentUpdateRequest, GenerateDocumentPodcastRequest, DocumentMarkdownConvertRequest, DocumentGraphGenerateRequest } from '@/generated'
import { CreateLabelResponse } from '@/generated/models/CreateLabelResponse'
import { LabelListResponse } from '@/generated/models/LabelListResponse'
import { request } from '@/lib/request'
import { serverRequest } from '@/lib/request-server'

export const transformToMarkdown = async (data: DocumentMarkdownConvertRequest): Promise<NormalResponse> => {
    return await request(documentApi.transformToMarkdown, {
        data
    })
}

export const generateDocumentPodcast = async (data: GenerateDocumentPodcastRequest): Promise<NormalResponse> => {
    return await request(documentApi.generateDocumentPodcast, {
        data
    })
}

export const generateDocumentGraph = async (data: DocumentGraphGenerateRequest): Promise<NormalResponse> => {
    return await request(documentApi.generateDocumentGraph, {
        data
    })
}

export const summaryDocumentContentByAi = async (data: DocumentAiSummaryRequest): Promise<NormalResponse> => {
    return await request(documentApi.summaryContent, {
        data
    })
}

export const createDocumentNote = async (data: DocumentNoteCreateRequest): Promise<NormalResponse> => {
    return await request(documentApi.createDocumentNote, {
        data
    })
}

export const deleteDocumentNote = async (data: DocumentNoteDeleteRequest): Promise<NormalResponse> => {
    return await request(documentApi.deleteDocumentNotes, {
        data
    })
}

export const searchDocumentNotes = async (data: SearchDocumentNoteRequest): Promise<InifiniteScrollPagnitionDocumentNoteInfo> => {
    return await request(documentApi.searchDocumentNotes, {
        data
    })
}

export const summaryMonthDocumentCount = async (): Promise<DocumentMonthSummaryResponse> => {
    return await request(documentApi.summaryMonthDocumentCount)
}

export const getLabels = async (): Promise<LabelListResponse> => {
    return await request(documentApi.listLabel)
}

export const searchDocumentVector = async (data: VectorSearchRequest): Promise<VectorSearchResponse> => {
    return await request(documentApi.searchDocumentVector, {
        data
    })
}

export const createDocument = async (data: DocumentCreateRequest): Promise<DocumentCreateResponse> => {
    return await request(documentApi.createDocument, {
        data
    })
}

export const createLabel = async ({ name }: { name: string }): Promise<CreateLabelResponse> => {
    return await request(documentApi.createLabel, {
        data: {
            name
        }
    })
}

export const searchUserUnreadDocument = async (data: SearchUnreadListRequest): Promise<InifiniteScrollPagnitionDocumentInfo> => {
    return await request(documentApi.searchUserUnreadDocument, {
        data
    })
}

export const searchAllMyDocument = async (data: SearchAllMyDocumentsRequest): Promise<InifiniteScrollPagnitionDocumentInfo> => {
    return await request(documentApi.searchMyDocuments, { data })
}

export const searchUserRecentReadDocument = async (data: SearchRecentReadRequest): Promise<InifiniteScrollPagnitionDocumentInfo> => {
    return await request(documentApi.searchUserRecentReadDocument, {
        data
    })
}

export const searchUserRecentReadDocumentInServer = async (data: SearchRecentReadRequest, headers: Headers): Promise<InifiniteScrollPagnitionDocumentInfo> => {
    return await serverRequest(documentApi.searchUserRecentReadDocument, {
        data,
        headers
    })
}

export const searchUserStarDocument = async (data: SearchMyStarDocumentsRequest): Promise<InifiniteScrollPagnitionDocumentInfo> => {
    return await request(documentApi.searchStarDocument, { data })
}

export const getDocumentDetail = async ({ document_id }: { document_id: number }): Promise<DocumentDetailResponse> => {
    return await request(documentApi.documentDetail, {
        data: {
            document_id
        }
    })
}

export const updateDocument = async (data: DocumentUpdateRequest): Promise<NormalResponse> => {
    return await request(documentApi.updateDocument, {
        data
    })
}

export const readDocument = async (data: ReadRequest): Promise<NormalResponse> => {
    return await request(documentApi.readDocument, {
        data
    })
}

export const starDocument = async (data: StarRequest): Promise<NormalResponse> => {
    return await request(documentApi.starDocument, {
        data
    })
}

export const deleteDocument = async (data: DocumentDeleteRequest): Promise<NormalResponse> => {
    return await request(documentApi.deleteDocument, {
        data
    })
}

export const getDocumentLabelSummary = async (): Promise<LabelSummaryResponse> => {
    return await request(documentApi.getDocumentLabelSummary)
}