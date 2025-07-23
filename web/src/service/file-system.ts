import { request } from '@/lib/request'
import fileSystemApi from '@/api/file_system'
import { BuiltInStsResponse, FileSystemInfo, FileSystemInfoRequest, FileSystemInstallRequest, FileSystemSearchRequest, FileSystemUpdateRequest, FileUrlPrefixRequest, FileUrlPrefixResponse, MineFileSystemSearchResponse, NormalResponse, OssStsResponse, ProvideFileSystemSearchResponse, UserFileSystemInfo, UserFileSystemInfoRequest } from '@/generated'

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

export const getFileSystemDetail = async (data: FileSystemInfoRequest): Promise<FileSystemInfo> => {
    return await request(fileSystemApi.getFileSystemDetail, {
        data
    })
}

export const getUserFileSystemDetail = async (data: UserFileSystemInfoRequest): Promise<UserFileSystemInfo> => {
    return await request(fileSystemApi.getUserFileSystemDetail, {
        data
    })
}

export const getAliyunOSSSts = async (): Promise<OssStsResponse> => {
    return await request(fileSystemApi.getAliyunOSSSTSToken)
}

export const getBuiltInSts = async (): Promise<BuiltInStsResponse> => {
    return await request(fileSystemApi.getBuiltInSTSToken)
}

export const getUserFileUrlPrefix = async (data: FileUrlPrefixRequest): Promise<FileUrlPrefixResponse> => {
    return await request(fileSystemApi.getUserFileUrlPrefix, {
        data
    })
}