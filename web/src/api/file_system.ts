import { API_PREFIX } from "@/config/api"

export default {
    getMineFileSystems: API_PREFIX + '/file-system/mine',
    getProvideFileSystems: API_PREFIX + '/file-system/provide',
    installFileSystem: API_PREFIX + '/file-system/install',
    updateFileSystem: API_PREFIX + '/file-system/update',
    getFileSystemDetail: API_PREFIX + '/file-system/detail',
    getUserFileSystemDetail: API_PREFIX + '/file-system/user-file-system/detail',
    getAliyunOSSPresignUploadURL: API_PREFIX + "/file-system/aliyun-oss/presign-upload-url",
    getAWSS3PresignUploadURL: API_PREFIX + "/file-system/aws-s3/presign-upload-url",
    getBuiltInPresignUploadURL: API_PREFIX + "/file-system/built-in/presign-upload-url",
    getUserFileUrlPrefix: API_PREFIX + "/file-system/url-prefix",
    deleteUserFileSystem: API_PREFIX + "/file-system/user-file-system/delete",
    uploadFileToGenericFileSystem: API_PREFIX + "/file-system/generic-s3/upload",
}