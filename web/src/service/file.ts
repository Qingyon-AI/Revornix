import { request } from '@/lib/request'
import FILE_API from '@/api/file'
import { NormalResponse } from '@/generated'

export const uploadFile = async (name: string, file: File): Promise<NormalResponse> => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('path', name)
    return await request(FILE_API.UPLOAD_API, {
        method: 'POST',
        formData: formData
    })
}

export const getFile = async (path: string): Promise<string> => {
    return await request(FILE_API.READ_API, {
        method: 'POST',
        data: {
            path
        }
    })
}