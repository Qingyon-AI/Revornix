import documentApi from '@/api/document'
import { InifiniteScrollPagnitionDocumentInfo, DocumentDetailResponse, NormalResponse, ReadRequest, StarRequest, DocumentDeleteRequest, DocumentCreateRequest, DocumentCreateResponse, SearchAllMyDocumentsRequest, SearchMyStarDocumentsRequest, SearchRecentReadRequest, VectorSearchRequest, VectorSearchResponse, DocumentMonthSummaryResponse, DocumentNoteCreateRequest, DocumentNoteDeleteRequest, InifiniteScrollPagnitionDocumentNoteInfo, SearchDocumentNoteRequest, SearchUnreadListRequest, LabelSummaryResponse, DocumentUpdateRequest, DocumentMarkdownConvertRequest, DocumentEmbeddingRequest } from '@/generated'
import { CreateLabelResponse } from '@/generated/models/CreateLabelResponse'
import { LabelListResponse } from '@/generated/models/LabelListResponse'
import { request } from '@/lib/request'
import { publicRequest } from '@/lib/request-public'
import { serverRequest } from '@/lib/request-server'

export type DocumentAiSummaryRequest = {
    document_id: number
    model_id?: number
}

export type DocumentPublishRequest = {
    document_id: number
    status: boolean
}

export type DocumentPublishGetRequest = {
    document_id: number
}

export type DocumentPublishGetResponse = {
    status: boolean
    create_time?: string | null
    update_time?: string | null
}

export type MineDocumentAuthorityRequest = {
    document_id: number
}

export type DocumentUserAuthorityResponse = {
    document_id: number
    user_id: number
    authority: number
    is_creator: boolean
}

export type DocumentUserRequest = {
    document_id: number
    start?: number
    limit?: number
    keyword?: string
}

export type DocumentUserAddRequest = {
    document_id: number
    user_id: number
    authority: 0 | 1 | 2
}

export type DocumentUserModifyRequest = {
    document_id: number
    user_id: number
    authority: 0 | 1 | 2
}

export type DocumentUserDeleteRequest = {
    document_id: number
    user_id: number
}

export type DocumentCollaboratorPublicInfo = {
    id: number
    avatar: string
    nickname: string
    slogan?: string | null
    authority?: 0 | 1 | 2 | null
    create_time: string
    update_time?: string | null
}

export type InfiniteScrollPagination<T> = {
    total: number
    start?: number | null
    limit: number
    has_more: boolean
    next_start?: number | null
    elements: T[]
}

export type GenerateDocumentPodcastRequest = {
    document_id: number
    engine_id?: number
}

export type DocumentGraphGenerateRequest = {
    document_id: number
    model_id?: number
}

export type DocumentTranscribeRequest = {
    document_id: number
    engine_id?: number
}

export type CancelDocumentTaskRequest = {
    document_id: number
}

export type DocumentMarkdownContentRequest = {
    document_id?: number
    url?: string
    snapshot_id?: number
}

export const transcribeDocument = async (data: DocumentTranscribeRequest): Promise<NormalResponse> => {
    return await request(documentApi.transcribeDocument, {
        data
    })
}

export const cancelDocumentTranscribe = async (data: CancelDocumentTaskRequest): Promise<NormalResponse> => {
    return await request(documentApi.cancelDocumentTranscribe, {
        data
    })
}

export const embeddingDocument = async (data: DocumentEmbeddingRequest): Promise<NormalResponse> => {
    return await request(documentApi.embeddingDocument, {
        data
    })
}

export const cancelDocumentEmbedding = async (data: CancelDocumentTaskRequest): Promise<NormalResponse> => {
    return await request(documentApi.cancelDocumentEmbedding, {
        data
    })
}

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

export const cancelDocumentPodcast = async (data: CancelDocumentTaskRequest): Promise<NormalResponse> => {
    return await request(documentApi.cancelDocumentPodcast, {
        data
    })
}

export const generateDocumentGraph = async (data: DocumentGraphGenerateRequest): Promise<NormalResponse> => {
    return await request(documentApi.generateDocumentGraph, {
        data
    })
}

export const cancelDocumentGraph = async (data: CancelDocumentTaskRequest): Promise<NormalResponse> => {
    return await request(documentApi.cancelDocumentGraph, {
        data
    })
}

export const publishDocument = async (data: DocumentPublishRequest): Promise<NormalResponse> => {
    return await request(documentApi.publishDocument, {
        data
    })
}

export const getDocumentPublish = async (data: DocumentPublishGetRequest): Promise<DocumentPublishGetResponse> => {
    return await request(documentApi.getDocumentPublish, {
        data
    })
}

export const getDocumentMarkdownContent = async (data: DocumentMarkdownContentRequest): Promise<string> => {
    return await request(documentApi.getDocumentMarkdownContent, {
        data
    })
}

export const getDocumentMarkdownContentInServer = async (data: DocumentMarkdownContentRequest): Promise<string> => {
    return await serverRequest(documentApi.getDocumentMarkdownContent, {
        data
    })
}

export const getMineDocumentAuthority = async (data: MineDocumentAuthorityRequest): Promise<DocumentUserAuthorityResponse> => {
    return await request(documentApi.getMineDocumentAuthority, {
        data
    })
}

export const getDocumentUser = async (data: DocumentUserRequest): Promise<InfiniteScrollPagination<DocumentCollaboratorPublicInfo>> => {
    return await request(documentApi.getDocumentUser, {
        data
    })
}

export const addDocumentUser = async (data: DocumentUserAddRequest): Promise<NormalResponse> => {
    return await request(documentApi.addDocumentUser, {
        data
    })
}

export const modifyDocumentUser = async (data: DocumentUserModifyRequest): Promise<NormalResponse> => {
    return await request(documentApi.modifyDocumentUser, {
        data
    })
}

export const deleteDocumentUser = async (data: DocumentUserDeleteRequest): Promise<NormalResponse> => {
    return await request(documentApi.deleteDocumentUser, {
        data
    })
}

export const summaryDocumentContentByAi = async (data: DocumentAiSummaryRequest): Promise<NormalResponse> => {
    return await request(documentApi.summaryContent, {
        data
    })
}

export const cancelDocumentSummary = async (data: CancelDocumentTaskRequest): Promise<NormalResponse> => {
    return await request(documentApi.cancelDocumentSummary, {
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

export const getPublicDocumentDetail = async ({ document_id }: { document_id: number }): Promise<DocumentDetailResponse> => {
    return await publicRequest(documentApi.documentDetail, {
        data: {
            document_id
        }
    })
}

export const getDocumentDetailInServer = async (
    { document_id }: { document_id: number },
    headers: Headers,
): Promise<DocumentDetailResponse> => {
    return await serverRequest(documentApi.documentDetail, {
        data: {
            document_id,
        },
        headers,
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
