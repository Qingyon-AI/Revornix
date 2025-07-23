import { API_PREFIX } from "@/config/api"

export default {
    getMineFileSystems: API_PREFIX + '/file-system/mine',
    getProvideFileSystems: API_PREFIX + '/file-system/provide',
    installFileSystem: API_PREFIX + '/file-system/install',
    updateFileSystem: API_PREFIX + '/file-system/update',
    getFileSystemDetail: API_PREFIX + '/file-system/detail',
    getUserFileSystemDetail: API_PREFIX + '/file-system/user-file-system/detail',
    getAliyunOSSSTSToken: API_PREFIX + "/file-system/oss/sts",
    getBuiltInSTSToken: API_PREFIX + "/file-system/built-in/sts",
    getUserFileUrlPrefix: API_PREFIX + "/file-system/url-prefix",
}