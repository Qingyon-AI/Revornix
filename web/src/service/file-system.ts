import { request } from '@/lib/request'
import fileSystemApi from '@/api/file_system'
import { AliyunOSSPresignUploadURLRequest, AliyunOSSPresignUploadURLResponse, FileSystemInfo, FileSystemInfoRequest, FileSystemInstallRequest, FileSystemInstallResponse, FileSystemSearchRequest, FileUrlPrefixRequest, FileUrlPrefixResponse, MineFileSystemSearchResponse, NormalResponse, ProvideFileSystemSearchResponse, S3PresignUploadURLRequest, S3PresignUploadURLResponse, UserFileSystemDeleteRequest, UserFileSystemInfo, UserFileSystemInfoRequest, UserFileSystemUpdateRequest } from '@/generated'

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

export const installFileSystem = async (data: FileSystemInstallRequest): Promise<FileSystemInstallResponse> => {
    return await request(fileSystemApi.installFileSystem, {
        data
    })
}

export const updateFileSystem = async (data: UserFileSystemUpdateRequest): Promise<NormalResponse> => {
    return await request(fileSystemApi.updateFileSystem, {
        data
    })
}

export const deleteUserFileSystem = async (data: UserFileSystemDeleteRequest): Promise<NormalResponse> => {
    return await request(fileSystemApi.deleteUserFileSystem, {
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

export const getAliyunOSSPresignUploadURL = async (data: AliyunOSSPresignUploadURLRequest): Promise<AliyunOSSPresignUploadURLResponse> => {
    return await request(fileSystemApi.getAliyunOSSPresignUploadURL, {
        data
    })
}

export const getAWSS3PresignUploadURL = async (data: S3PresignUploadURLRequest): Promise<S3PresignUploadURLResponse> => {
    return await request(fileSystemApi.getAWSS3PresignUploadURL, {
        data
    })
}

export const getBuiltInPresignUploadURL = async (data: S3PresignUploadURLRequest): Promise<S3PresignUploadURLResponse> => {
    return await request(fileSystemApi.getBuiltInPresignUploadURL, {
        data
    })
}

export const getUserFileUrlPrefix = async (data: FileUrlPrefixRequest): Promise<FileUrlPrefixResponse> => {
    return await request(fileSystemApi.getUserFileUrlPrefix, {
        data
    })
}