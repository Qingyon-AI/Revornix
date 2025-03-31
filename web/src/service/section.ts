import sectionApi from '@/api/section'
import { AllMySectionsResponse, CreateLabelResponse, DaySectionRequest, DaySectionResponse, InifiniteScrollPagnitionSectionCommentInfo, InifiniteScrollPagnitionSectionInfo, LabelAddRequest, LabelListResponse, NormalResponse, SearchMineSectionsRequest, SearchSubscribedSectionRequest, SearchUserSectionsRequest, SectionCommentCreateRequest, SectionCommentDeleteRequest, SectionCommentSearchRequest, SectionCreateRequest, SectionCreateResponse, SectionDeleteRequest, SectionDetailRequest, SectionInfo, SectionSubscribeRequest, SectionUpdateRequest } from '@/generated';
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

// export const addSection = async (title: string, description: string, labels: number[], documents: number[]) => {
//     const [res, err] = await utils.to(request(sectionApi.addSection, 'POST', {
//         title,
//         description,
//         labels,
//         documents
//     }))
//     return [res, err]
// }

// export const getLabels = async () => {
//     const [res, err] = await utils.to(request(sectionApi.getSectionLabels, 'POST'))
//     return [res, err]
// }

// export const deleteLabels = async (ids: number[]) => {
//     const [res, err] = await utils.to(request(sectionApi.deleteSectionLabels, 'POST', {
//         ids
//     }))
//     return [res, err]
// }

// export const updateLabel = async (id: number, name: string) => {
//     const [res, err] = await utils.to(request(sectionApi.updateSectionLabel, 'POST', {
//         id,
//         name
//     }))
//     return [res, err]
// }

// export const deleteSection = async (id: string) => {
//     const [res, err] = await utils.to(request(sectionApi.deleteSection, 'POST', {
//         id
//     }))
//     return [res, err]
// }

// export const searchMySection = async (keyword: string, pageNum: number, pageSize: number) => {
//     const [res, err] = await utils.to(request(sectionApi.searchMySection, 'POST', {
//         keyword,
//         page_num: pageNum,
//         page_size: pageSize
//     }))
//     return [res, err]
// }

// export const searchSection = async (keyword: string, pageNum: number, pageSize: number) => {
//     const [res, err] = await utils.to(request(sectionApi.searchSection, 'POST', {
//         keyword,
//         page_num: pageNum,
//         page_size: pageSize
//     }))
//     return [res, err]
// }

// export const getDaySection = async (date: string) => {
//     const [res, err] = await utils.to(request(sectionApi.getDaySection, 'POST', {
//         date
//     }))
//     return [res, err]
// }

// export const getSectionDetail = async (id: number) => {
//     const [res, err] = await utils.to(request(sectionApi.getSectionDetail, 'POST', {
//         id
//     }))
//     return [res, err]
// }