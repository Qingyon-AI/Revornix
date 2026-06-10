import sectionApi from '@/api/section'
import { AllMySectionsResponse, DaySectionRequest, DaySectionResponse, InfiniteScrollPaginationSectionDocumentInfo, InfiniteScrollPaginationSectionInfo, InfiniteScrollPaginationSectionUserPublicInfo, MineSectionRoleAndAuthorityRequest, NormalResponse, SearchMineSectionsRequest, SearchSubscribedSectionRequest, SearchUserSectionsRequest, SectionCommentDeleteRequest, SectionCreateRequest, SectionCreateResponse, SectionDeleteRequest, SectionDetailRequest, SectionDocumentRequest, SectionInfo, SectionPublishGetRequest, SectionPublishGetResponse, SectionPublishRequest, SectionRePublishRequest, SectionSeoDetailRequest, SectionSubscribeRequest, SectionUpdateRequest, SectionUserAddRequest, SectionUserDeleteRequest, SectionUserModifyRequest, SectionUserRequest, SectionUserRoleAndAuthorityRequest, SectionUserRoleAndAuthorityResponse, UserPublicInfo, RetrySectionDocumentRequest, TriggerSectionProcessRequest, GenerateSectionPptRequest, GenerateSectionPodcastRequest, CancelSectionTaskRequest, SectionPptSlide, SectionCommentCreateRequest, SectionCommentSearchRequest, SectionCommentReplySearchRequest, SectionCommentLikeRequest } from '@/generated';

// Re-export generated models so consumers can keep importing from this module.
export type { RetrySectionDocumentRequest, TriggerSectionProcessRequest, GenerateSectionPptRequest, GenerateSectionPodcastRequest, CancelSectionTaskRequest, SectionPptSlide, SectionCommentCreateRequest, SectionCommentSearchRequest, SectionCommentReplySearchRequest, SectionCommentLikeRequest } from '@/generated';
import { CreateLabelResponse } from '@/generated/models/CreateLabelResponse';
import { LabelAddRequest } from '@/generated/models/LabelAddRequest';
import { LabelListResponse } from '@/generated/models/LabelListResponse';
import { request } from '@/lib/request';
import type { ServerRequestOptions } from '@/lib/request-core';
import { serverRequest } from '@/lib/request-server';

export type SectionPinRequest = {
    section_id: number
    status: boolean
}

// NOTE: kept local (not the generated model) — the generated type declares Date
// timestamps, but the raw `request` wrapper returns plain JSON strings.
export type SectionPptPreview = {
    status: string
    title?: string | null
    subtitle?: string | null
    theme_prompt?: string | null
    pptx_url?: string | null
    error_message?: string | null
    create_time?: string | null
    update_time?: string | null
    slides: SectionPptSlide[]
}

export type SectionDetailWithPpt = SectionInfo & {
    ppt_preview?: SectionPptPreview | null
}

export const getMineUserRoleAndAuthority = async (data: MineSectionRoleAndAuthorityRequest): Promise<SectionUserRoleAndAuthorityResponse> => {
    return await request(sectionApi.getMineSectionRoleAndAuthority, {
        data
    })
}

export const getSectionUserRoleAndAuthority = async (data: SectionUserRoleAndAuthorityRequest): Promise<SectionUserRoleAndAuthorityResponse> => {
    return await request(sectionApi.getSectionUserRoleAndAuthority, {
        data
    })
}

export const generateSectionPodcast = async (data: GenerateSectionPodcastRequest): Promise<NormalResponse> => {
    return await request(sectionApi.generateSectionPodcast, {
        data
    })
}

export const cancelSectionPodcast = async (data: CancelSectionTaskRequest): Promise<NormalResponse> => {
    return await request(sectionApi.cancelSectionPodcast, {
        data
    })
}

export const generateSectionPpt = async (data: GenerateSectionPptRequest): Promise<NormalResponse> => {
    return await request(sectionApi.generateSectionPpt, {
        data
    })
}

export const cancelSectionPpt = async (data: CancelSectionTaskRequest): Promise<NormalResponse> => {
    return await request(sectionApi.cancelSectionPpt, {
        data
    })
}

export const triggerSectionProcess = async (data: TriggerSectionProcessRequest): Promise<NormalResponse> => {
    return await request(sectionApi.triggerSectionProcess, {
        data
    })
}

export const cancelSectionProcess = async (data: CancelSectionTaskRequest): Promise<NormalResponse> => {
    return await request(sectionApi.cancelSectionProcess, {
        data
    })
}

export const getMineLabels = async (): Promise<LabelListResponse> => {
    return await request(sectionApi.getMineLabels)
}

export const getPublicLabels = async (): Promise<LabelListResponse> => {
    return await request(sectionApi.getPublicLabels)
}

export const createLabel = async (data: LabelAddRequest): Promise<CreateLabelResponse> => {
    return await request(sectionApi.createLabel, {
        data
    })
}

export const subscribeSection = async (data: SectionSubscribeRequest): Promise<NormalResponse> => {
    return await request(sectionApi.subscribeSection, {
        data
    })
}

export const updateSection = async (data: SectionUpdateRequest): Promise<NormalResponse> => {
    return await request(sectionApi.updateSection, {
        data
    })
}

export const getDayDocumentsSummarySection = async (data: DaySectionRequest): Promise<DaySectionResponse> => {
    return await request(sectionApi.getDayDocumentSummarySection, {
        data
    })
}

export const getAllMineSections = async (): Promise<AllMySectionsResponse> => {
    return await request(sectionApi.getAllMineSections)
}

export const searchMineSection = async (data: SearchMineSectionsRequest): Promise<InfiniteScrollPaginationSectionInfo> => {
    return await request(sectionApi.searchMySection, {
        data
    })
}

export const searchUserSection = async (data: SearchUserSectionsRequest): Promise<InfiniteScrollPaginationSectionInfo> => {
    return await request(sectionApi.searchUserSection, {
        data
    })
}

export const searchPublicSection = async (data: SearchMineSectionsRequest): Promise<InfiniteScrollPaginationSectionInfo> => {
    return await request(sectionApi.searchPublicSection, {
        data
    })
}

export const createSection = async (data: SectionCreateRequest): Promise<SectionCreateResponse> => {
    return await request(sectionApi.createSection, {
        data
    })
}

export const deleteSection = async (data: SectionDeleteRequest): Promise<NormalResponse> => {
    return await request(sectionApi.deleteSection, {
        data
    })
}

export const getSectionDetail = async (data: SectionDetailRequest): Promise<SectionDetailWithPpt> => {
    return await request(sectionApi.getSectionDetail, {
        data
    })
}

export const getSectionMarkdownContent = async (data: SectionDetailRequest): Promise<string> => {
    return await request(sectionApi.getSectionMarkdownContent, {
        data
    })
}

export const getSectionDetailServer = async (
    data: SectionDetailRequest,
    headers?: Headers,
): Promise<SectionDetailWithPpt> => {
    return await serverRequest(sectionApi.getSectionDetail, {
        data,
        headers,
    })
}

export const getSEOSectionDetail = async (data: SectionSeoDetailRequest): Promise<SectionDetailWithPpt> => {
    return await request(sectionApi.getSEOSectionDetail, {
        data
    })
}

export type SectionCommentSortType = 'time' | 'hot'

// NOTE: kept local — generated model declares Date timestamps (runtime is string).
export type SectionCommentInfo = {
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
    preview_replies: SectionCommentInfo[]
}

export type InfiniteScrollPaginationSectionCommentInfo = {
    total: number
    start?: number | null
    limit: number
    has_more: boolean
    elements: SectionCommentInfo[]
    next_start?: number | null
}

export const createSectionComment = async (data: SectionCommentCreateRequest): Promise<NormalResponse> => {
    return await request(sectionApi.createComment, {
        data
    })
}

export const deleteSectionComment = async (data: SectionCommentDeleteRequest): Promise<NormalResponse> => {
    return await request(sectionApi.deleteComment, {
        data
    })
}

export const searchSectionComment = async (data: SectionCommentSearchRequest): Promise<InfiniteScrollPaginationSectionCommentInfo> => {
    return await request(sectionApi.searchComment, {
        data
    })
}

export const searchSectionCommentReplies = async (data: SectionCommentReplySearchRequest): Promise<InfiniteScrollPaginationSectionCommentInfo> => {
    return await request(sectionApi.searchCommentReplies, {
        data
    })
}

export const likeSectionComment = async (data: SectionCommentLikeRequest): Promise<NormalResponse> => {
    return await request(sectionApi.likeComment, {
        data
    })
}

export const unlikeSectionComment = async (data: SectionCommentLikeRequest): Promise<NormalResponse> => {
    return await request(sectionApi.unlikeComment, {
        data
    })
}

export const getSectionCommentDetail = async (data: { section_comment_id: number }): Promise<SectionCommentInfo> => {
    return await request(sectionApi.getCommentDetail, {
        data
    })
}

export const getMySubscribedSecitions = async (data: SearchSubscribedSectionRequest): Promise<InfiniteScrollPaginationSectionInfo> => {
    return await request(sectionApi.mySubscribedSecitions, {
        data
    })
}

export const addSectionUser = async (data: SectionUserAddRequest): Promise<NormalResponse> => {
    return await request(sectionApi.addSectionUser, {
        data
    })
}

export const modifySectionUser = async (data: SectionUserModifyRequest): Promise<NormalResponse> => {
    return await request(sectionApi.modifySectionUser, {
        data
    })
}

export const deleteSectionUser = async (data: SectionUserDeleteRequest): Promise<NormalResponse> => {
    return await request(sectionApi.deleteSectionUser, {
        data
    })
}

export const getSectionUser = async (data: SectionUserRequest): Promise<InfiniteScrollPaginationSectionUserPublicInfo> => {
    return await request(sectionApi.getSectionUser, {
        data
    })
}

export const publishSection = async (data: SectionPublishRequest): Promise<NormalResponse> => {
    return await request(sectionApi.publishSection, {
        data
    })
}

export const republishSection = async (data: SectionRePublishRequest): Promise<NormalResponse> => {
    return await request(sectionApi.republishSection, {
        data
    })
}

export const getSectionPublish = async (data: SectionPublishGetRequest): Promise<SectionPublishGetResponse> => {
    return await request(sectionApi.getSectionPublish, {
        data
    })
}

export type SectionAccessKeyUpdateRequest = {
    section_id: number
    // null/blank clears the key (link becomes fully public again)
    access_key?: string | null
}

export const updateSectionPublishAccessKey = async (data: SectionAccessKeyUpdateRequest): Promise<NormalResponse> => {
    return await request(sectionApi.updateSectionPublishAccessKey, {
        data
    })
}

export const searchSectionDocuments = async (data: SectionDocumentRequest): Promise<InfiniteScrollPaginationSectionDocumentInfo> => {
    return await request(sectionApi.searchSectionDocuments, {
        data
    })
}

export const retrySectionDocumentIntegration = async (data: RetrySectionDocumentRequest): Promise<NormalResponse> => {
    return await request(sectionApi.retrySectionDocumentIntegration, {
        data
    })
}

// --- SSR helpers ----------------------------------------------------------
// These run inside RSC / route handlers (via serverRequest) and bypass the
// browser-only refresh flow. Use them from app/(seo)/* pages and other server
// contexts.

type ServerFetchOptions = Pick<ServerRequestOptions, 'retries' | 'timeoutMs' | 'anonymousFallback'>

export const searchPublicSectionServer = async (
    data: SearchMineSectionsRequest,
    options?: ServerFetchOptions,
): Promise<InfiniteScrollPaginationSectionInfo> => {
    return await serverRequest(sectionApi.searchPublicSection, {
        data,
        retries: options?.retries,
        timeoutMs: options?.timeoutMs,
        anonymousFallback: options?.anonymousFallback,
    })
}

export const searchUserSectionServer = async (
    data: SearchUserSectionsRequest,
): Promise<InfiniteScrollPaginationSectionInfo> => {
    return await serverRequest(sectionApi.searchUserSection, { data })
}

export const getPublicLabelsServer = async (
    options?: ServerFetchOptions,
): Promise<LabelListResponse['data']> => {
    const response = await serverRequest<LabelListResponse>(sectionApi.getPublicLabels, {
        retries: options?.retries,
        timeoutMs: options?.timeoutMs,
        anonymousFallback: options?.anonymousFallback,
    })
    return response.data
}

export const searchSectionDocumentsServer = async (
    data: SectionDocumentRequest,
): Promise<InfiniteScrollPaginationSectionDocumentInfo> => {
    return await serverRequest(sectionApi.searchSectionDocuments, { data })
}

export const searchSectionCommentServer = async (
    data: SectionCommentSearchRequest,
): Promise<InfiniteScrollPaginationSectionCommentInfo> => {
    return await serverRequest(sectionApi.searchComment, { data })
}

export const getSEOSectionMarkdownContentServer = async (data: {
    uuid: string
    access_key?: string
}): Promise<string> => {
    return await serverRequest(sectionApi.getSEOSectionMarkdownContent, { data })
}
