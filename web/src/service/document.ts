import documentApi from '@/api/document'
import { InfiniteScrollPaginationDocumentInfo, DocumentDetailResponse, NormalResponse, ReadRequest, StarRequest, DocumentDeleteRequest, DocumentCreateRequest, DocumentCreateResponse, SearchAllMyDocumentsRequest, SearchMyStarDocumentsRequest, SearchRecentReadRequest, VectorSearchRequest, VectorSearchResponse, DocumentMonthSummaryResponse, DocumentNoteCreateRequest, DocumentNoteDeleteRequest, InfiniteScrollPaginationDocumentNoteInfo, SearchDocumentNoteRequest, SearchUnreadListRequest, LabelSummaryResponse, DocumentUpdateRequest, DocumentMarkdownConvertRequest, DocumentEmbeddingRequest, UserPublicInfo, DocumentAiSummaryRequest, DocumentPublishRequest, DocumentPublishGetRequest, MineDocumentAuthorityRequest, DocumentUserAuthorityResponse, DocumentUserRequest, DocumentUserAddRequest, DocumentUserModifyRequest, DocumentUserDeleteRequest, GenerateDocumentPodcastRequest, DocumentGraphGenerateRequest, DocumentTranscribeRequest, DocumentAudioSpeakerRenameRequest, CancelDocumentTaskRequest, DocumentMarkdownContentRequest, SearchPublicDocumentsRequest, DocumentCommentCreateRequest, DocumentCommentSearchRequest, DocumentCommentReplySearchRequest, DocumentCommentLikeRequest, DocumentCommentDeleteRequest } from '@/generated'

// Re-export generated request/response models so consumers can keep importing from this module.
export type { DocumentAiSummaryRequest, DocumentPublishRequest, DocumentPublishGetRequest, MineDocumentAuthorityRequest, DocumentUserAuthorityResponse, DocumentUserRequest, DocumentUserAddRequest, DocumentUserModifyRequest, DocumentUserDeleteRequest, GenerateDocumentPodcastRequest, DocumentGraphGenerateRequest, DocumentTranscribeRequest, DocumentAudioSpeakerRenameRequest, CancelDocumentTaskRequest, DocumentMarkdownContentRequest, SearchPublicDocumentsRequest, DocumentCommentCreateRequest, DocumentCommentSearchRequest, DocumentCommentReplySearchRequest, DocumentCommentLikeRequest, DocumentCommentDeleteRequest } from '@/generated'
import { CreateLabelResponse } from '@/generated/models/CreateLabelResponse'
import { LabelListResponse } from '@/generated/models/LabelListResponse'
import { request } from '@/lib/request'
import type { ServerRequestOptions } from '@/lib/request-core'
import { serverRequest } from '@/lib/request-server'

export type DocumentPinRequest = {
    document_id: number
    status: boolean
}

// NOTE: kept local (not the generated model) — the generated type declares Date
// timestamps, but the raw `request` wrapper returns plain JSON strings.
export type DocumentPublishGetResponse = {
    status: boolean
    uuid?: string | null
    has_access_key?: boolean
    access_key?: string | null
    create_time?: string | null
    update_time?: string | null
}

export type DocumentAccessKeyUpdateRequest = {
    document_id: number
    // null/blank clears the key (link becomes fully public again)
    access_key?: string | null
}

// NOTE: kept local — generated model declares Date timestamps (runtime is string).
export type DocumentCollaboratorPublicInfo = {
    id: number
    avatar: string
    nickname: string
    slogan?: string | null
    authority?: 0 | 1 | 2 | null
    managed_by?: number | null
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

export const renameAudioSpeakers = async (data: DocumentAudioSpeakerRenameRequest): Promise<NormalResponse> => {
    return await request(documentApi.renameAudioSpeakers, {
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

export const updateDocumentPublishAccessKey = async (data: DocumentAccessKeyUpdateRequest): Promise<NormalResponse> => {
    return await request(documentApi.updateDocumentPublishAccessKey, {
        data
    })
}

export const getDocumentMarkdownContent = async (data: DocumentMarkdownContentRequest): Promise<string> => {
    return await request(documentApi.getDocumentMarkdownContent, {
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

export const searchDocumentNotes = async (data: SearchDocumentNoteRequest): Promise<InfiniteScrollPaginationDocumentNoteInfo> => {
    return await request(documentApi.searchDocumentNotes, {
        data
    })
}

export const searchPublicDocumentNotes = async (data: SearchDocumentNoteRequest): Promise<InfiniteScrollPaginationDocumentNoteInfo> => {
    return await request(documentApi.searchPublicDocumentNotes, {
        data
    })
}

export const summaryMonthDocumentCount = async (): Promise<DocumentMonthSummaryResponse> => {
    return await request(documentApi.summaryMonthDocumentCount)
}

export const getLabels = async (): Promise<LabelListResponse> => {
    return await request(documentApi.listLabel)
}

export const getPublicLabels = async (): Promise<LabelListResponse> => {
    return await request(documentApi.listPublicLabel)
}

export type GlobalSearchMode = 'vector' | 'text'

export type GlobalDocumentSearchRequest = VectorSearchRequest & {
    mode?: GlobalSearchMode
    limit?: number
}

export type GlobalDocumentSearchResponse = VectorSearchResponse & {
    snippets?: Record<number, string>
}

export const searchDocumentVector = async (data: GlobalDocumentSearchRequest): Promise<GlobalDocumentSearchResponse> => {
    return await request(documentApi.searchDocumentVector, {
        data
    })
}

export const searchPublicDocumentVector = async (data: GlobalDocumentSearchRequest): Promise<GlobalDocumentSearchResponse> => {
    return await request(documentApi.searchPublicDocumentVector, {
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

export const searchUserUnreadDocument = async (data: SearchUnreadListRequest): Promise<InfiniteScrollPaginationDocumentInfo> => {
    return await request(documentApi.searchUserUnreadDocument, {
        data
    })
}

export const searchAllMyDocument = async (data: SearchAllMyDocumentsRequest): Promise<InfiniteScrollPaginationDocumentInfo> => {
    return await request(documentApi.searchMyDocuments, { data })
}

export const searchPublicDocument = async (data: SearchPublicDocumentsRequest): Promise<InfiniteScrollPaginationDocumentInfo> => {
    return await request(documentApi.searchPublicDocument, { data })
}

export const searchUserRecentReadDocument = async (data: SearchRecentReadRequest): Promise<InfiniteScrollPaginationDocumentInfo> => {
    return await request(documentApi.searchUserRecentReadDocument, {
        data
    })
}

export const searchUserStarDocument = async (data: SearchMyStarDocumentsRequest): Promise<InfiniteScrollPaginationDocumentInfo> => {
    return await request(documentApi.searchStarDocument, { data })
}

export const getDocumentDetail = async ({ document_id, uuid, access_key }: { document_id?: number; uuid?: string; access_key?: string }): Promise<DocumentDetailResponse> => {
    return await request(documentApi.documentDetail, {
        data: {
            document_id,
            uuid,
            access_key
        }
    })
}

export const getDocumentDetailServer = async (
    { document_id, uuid, access_key }: { document_id?: number; uuid?: string; access_key?: string },
    headers?: Headers,
): Promise<DocumentDetailResponse> => {
    return await serverRequest(documentApi.documentDetail, {
        data: {
            document_id,
            uuid,
            access_key,
        },
        headers,
    })
}

export const updateDocument = async (data: DocumentUpdateRequest): Promise<NormalResponse> => {
    return await request(documentApi.updateDocument, {
        data
    })
}

export const touchDocumentContent = async (data: { document_id: number }): Promise<NormalResponse> => {
    return await request(documentApi.touchDocumentContent, {
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

// -----------------------------------------------------------------------------
// Document comments — mirror of section comment service
// -----------------------------------------------------------------------------

export type DocumentCommentSortType = 'time' | 'hot'

// NOTE: kept local — generated model declares Date timestamps (runtime is string).
export type DocumentCommentInfo = {
    id: number
    content: string
    create_time: string
    update_time?: string | null
    creator: UserPublicInfo
    parent_id?: number | null
    root_id?: number | null
    reply_user?: UserPublicInfo | null
    like_count: number
    liked: boolean
    reply_count: number
    preview_replies: DocumentCommentInfo[]
}

export type InfiniteScrollPaginationDocumentCommentInfo = {
    total: number
    start?: number | null
    limit: number
    has_more: boolean
    elements: DocumentCommentInfo[]
    next_start?: number | null
}

export const createDocumentComment = async (data: DocumentCommentCreateRequest): Promise<NormalResponse> => {
    return await request(documentApi.createComment, { data })
}

export const deleteDocumentComment = async (data: DocumentCommentDeleteRequest): Promise<NormalResponse> => {
    return await request(documentApi.deleteComment, { data })
}

export const searchDocumentComment = async (data: DocumentCommentSearchRequest): Promise<InfiniteScrollPaginationDocumentCommentInfo> => {
    return await request(documentApi.searchComment, { data })
}

export const searchDocumentCommentReplies = async (data: DocumentCommentReplySearchRequest): Promise<InfiniteScrollPaginationDocumentCommentInfo> => {
    return await request(documentApi.searchCommentReplies, { data })
}

export const likeDocumentComment = async (data: DocumentCommentLikeRequest): Promise<NormalResponse> => {
    return await request(documentApi.likeComment, { data })
}

export const unlikeDocumentComment = async (data: DocumentCommentLikeRequest): Promise<NormalResponse> => {
    return await request(documentApi.unlikeComment, { data })
}

export const getDocumentCommentDetail = async (data: { document_comment_id: number }): Promise<DocumentCommentInfo> => {
    return await request(documentApi.getCommentDetail, { data })
}

// --- SSR helpers ----------------------------------------------------------
// These run inside RSC / route handlers (via serverRequest) and bypass the
// browser-only refresh flow. Use them from app/(seo)/* pages and other server
// contexts.

type ServerFetchOptions = Pick<ServerRequestOptions, 'retries' | 'timeoutMs' | 'anonymousFallback'>

export const searchPublicDocumentServer = async (
    data: SearchPublicDocumentsRequest,
    options?: ServerFetchOptions,
): Promise<InfiniteScrollPaginationDocumentInfo> => {
    return await serverRequest(documentApi.searchPublicDocument, {
        data,
        retries: options?.retries,
        timeoutMs: options?.timeoutMs,
        anonymousFallback: options?.anonymousFallback,
    })
}

export const getPublicLabelsServer = async (
    options?: ServerFetchOptions,
): Promise<LabelListResponse['data']> => {
    const response = await serverRequest<LabelListResponse>(documentApi.listPublicLabel, {
        retries: options?.retries,
        timeoutMs: options?.timeoutMs,
        anonymousFallback: options?.anonymousFallback,
    })
    return response.data
}

export const searchDocumentCommentServer = async (
    data: DocumentCommentSearchRequest,
): Promise<InfiniteScrollPaginationDocumentCommentInfo> => {
    return await serverRequest(documentApi.searchComment, { data })
}

export const searchPublicDocumentNotesServer = async (
    data: SearchDocumentNoteRequest,
): Promise<InfiniteScrollPaginationDocumentNoteInfo> => {
    return await serverRequest(documentApi.searchPublicDocumentNotes, { data })
}

export const getDocumentMarkdownContentServer = async (data: {
    document_id?: number
    url?: string
    snapshot_id?: number
    access_key?: string
}): Promise<string> => {
    return await serverRequest(documentApi.getDocumentMarkdownContent, { data })
}
