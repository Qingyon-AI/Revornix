import fileSystemApi from '@/api/file_system'
import { FileSystemInstallRequest, FileSystemSearchRequest, FileSystemUpdateRequest, MineFileSystemSearchResponse, NormalResponse, ProvideFileSystemSearchResponse } from '@/generated'
import { request } from '@/lib/request'

export const getProvideFileSystems = async (data: FileSystemSearchRequest): Promise<ProvideFileSystemSearchResponse> => {
    return await request(fileSystemApi.getProvideFileSystems, {
        data
    })
}

export const getMineFileSystems = async (data: FileSystemSearchRequest): Promise<MineFileSystemSearchResponse> => {
    return await request(fileSystemApi.getMineFileSystems, {
        data
    })
}

export const installFileSystem = async (data: FileSystemInstallRequest): Promise<NormalResponse> => {
    return await request(fileSystemApi.installFileSystem, {
        data
    })
}

export const updateFileSystem = async (data: FileSystemUpdateRequest): Promise<NormalResponse> => {
    return await request(fileSystemApi.updateFileSystem, {
        data
    })
}