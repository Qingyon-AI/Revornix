import attachmentApi from '@/api/attachment'
import { AttachmentCreateRequest, AttachmentCreateResponse } from '@/generated'
import { request } from '@/lib/request'

export const createAttachment = async (data: AttachmentCreateRequest): Promise<AttachmentCreateResponse> => {
    return await request(attachmentApi.createAttachment, {
        data
    })
}
