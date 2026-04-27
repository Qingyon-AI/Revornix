import sectionApi from '@/api/section'
import { AllMySectionsResponse, DaySectionRequest, DaySectionResponse, InifiniteScrollPagnitionSectionDocumentInfo, InifiniteScrollPagnitionSectionInfo, InifiniteScrollPagnitionSectionUserPublicInfo, MineSectionRoleAndAuthorityRequest, NormalResponse, SearchMineSectionsRequest, SearchSubscribedSectionRequest, SearchUserSectionsRequest, SectionCommentDeleteRequest, SectionCreateRequest, SectionCreateResponse, SectionDeleteRequest, SectionDetailRequest, SectionDocumentRequest, SectionInfo, SectionPublishGetRequest, SectionPublishGetResponse, SectionPublishRequest, SectionRePublishRequest, SectionSeoDetailRequest, SectionSubscribeRequest, SectionUpdateRequest, SectionUserAddRequest, SectionUserDeleteRequest, SectionUserModifyRequest, SectionUserRequest, SectionUserRoleAndAuthorityRequest, SectionUserRoleAndAuthorityResponse, UserPublicInfo } from '@/generated';
import { CreateLabelResponse } from '@/generated/models/CreateLabelResponse';
import { LabelAddRequest } from '@/generated/models/LabelAddRequest';
import { LabelListResponse } from '@/generated/models/LabelListResponse';
import { request } from '@/lib/request';
import { publicRequest } from '@/lib/request-public';
import { serverRequest } from '@/lib/request-server';

export type RetrySectionDocumentRequest = {
    section_id: number
    document_id: number
}

export type TriggerSectionProcessRequest = {
    section_id: number
    model_id?: number
    image_engine_id?: number
    podcast_engine_id?: number
}

export type GenerateSectionPptRequest = {
    section_id: number
    model_id?: number
    image_engine_id?: number
}

export type GenerateSectionPodcastRequest = {
    section_id: number
    engine_id?: number
}

export type CancelSectionTaskRequest = {
    section_id: number
}

export type SectionPptSlide = {
    id: string
    title: string
    summary: string
    prompt: string
    image_url?: string | null
}

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

export const searchMineSection = async (data: SearchMineSectionsRequest): Promise<InifiniteScrollPagnitionSectionInfo> => {
    return await request(sectionApi.searchMySection, {
        data
    })
}

export const searchUserSection = async (data: SearchUserSectionsRequest): Promise<InifiniteScrollPagnitionSectionInfo> => {
    return await request(sectionApi.searchUserSection, {
        data
    })
}

export const searchPublicSection = async (data: SearchMineSectionsRequest): Promise<InifiniteScrollPagnitionSectionInfo> => {
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

export const getSEOSectionMarkdownContentInServer = async (data: SectionSeoDetailRequest): Promise<string> => {
    return await serverRequest(sectionApi.getSEOSectionMarkdownContent, {
        data
    })
}

export const getSectionDetailInServer = async (
    data: SectionDetailRequest,
    headers: Headers,
): Promise<SectionDetailWithPpt> => {
    return await serverRequest(sectionApi.getSectionDetail, {
        data,
        headers,
    })
}

export const getPublicSectionDetail = async (data: SectionDetailRequest): Promise<SectionDetailWithPpt> => {
    return await publicRequest(sectionApi.getSectionDetail, {
        data
    })
}

export const getSEOSectionDetail = async (data: SectionSeoDetailRequest): Promise<SectionDetailWithPpt> => {
    return await request(sectionApi.getSEOSectionDetail, {
        data
    })
}

export type SectionCommentSortType = 'time' | 'hot'

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

export type InifiniteScrollPagnitionSectionCommentInfo = {
    total: number
    start?: number | null
    limit: number
    has_more: boolean
    elements: SectionCommentInfo[]
    next_start?: number | null
}

export type SectionCommentCreateRequest = {
    content: string
    section_id: number
    parent_id?: number | null
}

export type SectionCommentSearchRequest = {
    section_id: number
    start?: number | null
    limit?: number
    keyword?: string | null
    sort?: SectionCommentSortType
    preview_reply_limit?: number
}

export type SectionCommentReplySearchRequest = {
    root_comment_id: number
    start?: number | null
    limit?: number
}

export type SectionCommentLikeRequest = {
    section_comment_id: number
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

export const searchSectionComment = async (data: SectionCommentSearchRequest): Promise<InifiniteScrollPagnitionSectionCommentInfo> => {
    return await request(sectionApi.searchComment, {
        data
    })
}

export const searchPublicSectionComment = async (data: SectionCommentSearchRequest): Promise<InifiniteScrollPagnitionSectionCommentInfo> => {
    return await publicRequest(sectionApi.searchComment, {
        data
    })
}

export const searchSectionCommentReplies = async (data: SectionCommentReplySearchRequest): Promise<InifiniteScrollPagnitionSectionCommentInfo> => {
    return await request(sectionApi.searchCommentReplies, {
        data
    })
}

export const searchPublicSectionCommentReplies = async (data: SectionCommentReplySearchRequest): Promise<InifiniteScrollPagnitionSectionCommentInfo> => {
    return await publicRequest(sectionApi.searchCommentReplies, {
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

export const getMySubscribedSecitions = async (data: SearchSubscribedSectionRequest): Promise<InifiniteScrollPagnitionSectionInfo> => {
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

export const getSectionUser = async (data: SectionUserRequest): Promise<InifiniteScrollPagnitionSectionUserPublicInfo> => {
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

export const searchSectionDocuments = async (data: SectionDocumentRequest): Promise<InifiniteScrollPagnitionSectionDocumentInfo> => {
    return await request(sectionApi.searchSectionDocuments, {
        data
    })
}

export const searchPublicSectionDocuments = async (data: SectionDocumentRequest): Promise<InifiniteScrollPagnitionSectionDocumentInfo> => {
    return await publicRequest(sectionApi.searchSectionDocuments, {
        data
    })
}

export const retrySectionDocumentIntegration = async (data: RetrySectionDocumentRequest): Promise<NormalResponse> => {
    return await request(sectionApi.retrySectionDocumentIntegration, {
        data
    })
}
