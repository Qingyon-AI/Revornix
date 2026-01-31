import { API_PREFIX } from "@/config/api"

export default {
    getMineFileSystems: API_PREFIX + '/file-system/mine',
    getProvideFileSystems: API_PREFIX + '/file-system/provide',
    installFileSystem: API_PREFIX + '/file-system/install',
    updateFileSystem: API_PREFIX + '/file-system/update',
    getFileSystemDetail: API_PREFIX + '/file-system/detail',
    getUserFileSystemDetail: API_PREFIX + '/file-system/user-file-system/detail',
    getPresignUploadURL: API_PREFIX + "/file-system/presign-upload-url",
    deleteUserFileSystem: API_PREFIX + "/file-system/user-file-system/delete",
    uploadFileToGenericFileSystem: API_PREFIX + "/file-system/generic-s3/upload",
}