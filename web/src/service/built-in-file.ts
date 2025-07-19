import { request } from '@/lib/request'
import FILE_API from '@/api/file'
import { NormalResponse } from '@/generated'

export class BuiltInFileService implements FileServiceProtocol {
    async getFileContent(file_path: string): Promise<string> {
        const url = `${process.env.NEXT_PUBLIC_FILE_API_PREFIX}/uploads/${file_path}`
        return await fetch(url).then(res => res.text())
    }
    async uploadFile(file_path: string, file: File): Promise<NormalResponse> {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('path', file_path)
        return await request(FILE_API.UPLOAD_API, {
            method: 'POST',
            formData: formData
        })
    }
}