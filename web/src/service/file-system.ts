import { request } from '@/lib/request'
import fileSystemApi from '@/api/file_system'
import { FileSystemInfo, FileSystemInfoRequest, FileSystemInstallRequest, FileSystemInstallResponse, FileSystemSearchRequest, MineFileSystemSearchResponse, NormalResponse, ProvideFileSystemSearchResponse, PresignUploadURLResponse, UserFileSystemDeleteRequest, UserFileSystemDetail, UserFileSystemInfoRequest, UserFileSystemUpdateRequest, PresignUploadURLRequest } from '@/generated'

export type StoredFileInfo = {
    id: number;
    owner_user_id: number;
    user_file_system_id: number;
    file_system_id: number;
    path: string;
    content_type?: string | null;
    size_bytes?: number | null;
    source?: string | null;
    create_time: string;
    update_time?: string | null;
}

export type StoredFileSearchRequest = {
    keyword?: string | null;
    user_file_system_id?: number | null;
    start?: number | null;
    limit?: number;
}

export type StoredFileSearchResponse = {
    total: number;
    start?: number | null;
    limit: number;
    has_more: boolean;
    next_start?: number | null;
    data: StoredFileInfo[];
}

export type StoredFileSyncRequest = {
    user_file_system_id?: number | null;
}

export type StoredFileSyncResponse = {
    synced: number;
    candidates: number;
    total: number;
}

export type StoredFileMigrateRequest = {
    source_user_file_system_id: number;
    target_user_file_system_id: number;
    stored_file_ids?: number[] | null;
}

export type StoredFileMigrateResponse = {
    migrated: number;
    skipped: number;
    failed: number;
}

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

export const getUserFileSystemDetail = async (data: UserFileSystemInfoRequest): Promise<UserFileSystemDetail> => {
    return await request(fileSystemApi.getUserFileSystemDetail, {
        data
    })
}

export const getPresignUploadURL = async (data: PresignUploadURLRequest): Promise<PresignUploadURLResponse> => {
    return await request(fileSystemApi.getPresignUploadURL, {
        data
    })
}

export const searchStoredFiles = async (data: StoredFileSearchRequest): Promise<StoredFileSearchResponse> => {
    return await request(fileSystemApi.searchStoredFiles, {
        data
    })
}

export const syncStoredFiles = async (data: StoredFileSyncRequest): Promise<StoredFileSyncResponse> => {
    return await request(fileSystemApi.syncStoredFiles, {
        data
    })
}

export const migrateStoredFiles = async (data: StoredFileMigrateRequest): Promise<StoredFileMigrateResponse> => {
    return await request(fileSystemApi.migrateStoredFiles, {
        data
    })
}
