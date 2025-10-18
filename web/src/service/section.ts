import sectionApi from '@/api/section'
import { AllMySectionsResponse, CreateLabelResponse, DaySectionRequest, DaySectionResponse, GetSectionDetailSectionDetailPostRequest, InifiniteScrollPagnitionSectionCommentInfo, InifiniteScrollPagnitionSectionInfo, LabelAddRequest, LabelListResponse, NormalResponse, SearchMineSectionsRequest, SearchSubscribedSectionRequest, SearchUserSectionsRequest, SectionCommentCreateRequest, SectionCommentDeleteRequest, SectionCommentSearchRequest, SectionCreateRequest, SectionCreateResponse, SectionDeleteRequest, SectionDetailRequest, SectionInfo, SectionPublishGetRequest, SectionPublishGetResponse, SectionPublishRequest, SectionRePublishRequest, SectionSeoDetailRequest, SectionSubscribeRequest, SectionUpdateRequest, SectionUserAddRequest, SectionUserDeleteRequest, SectionUserModifyRequest, SectionUserRequest, SectionUserResponse } from '@/generated';
import { request } from '@/lib/request';

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

export const getSectionDetail = async (data: SectionDetailRequest): Promise<SectionInfo> => {
    return await request(sectionApi.getSectionDetail, {
        data
    })
}

export const getSEOSectionDetail = async (data: SectionSeoDetailRequest): Promise<SectionInfo> => {
    return await request(sectionApi.getSEOSectionDetail, {
        data
    })
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

export const getSectionUser = async (data: SectionUserRequest): Promise<SectionUserResponse> => {
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