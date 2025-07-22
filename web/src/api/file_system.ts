import { API_PREFIX } from "@/config/api"

export default {
    getMineFileSystems: API_PREFIX + '/file_system/mine',
    getProvideFileSystems: API_PREFIX + '/file_system/provide',
    installFileSystem: API_PREFIX + '/file_system/install',
    updateFileSystem: API_PREFIX + '/file_system/update',
    getFileSystemDetail: API_PREFIX + '/file_system/detail',
    getAliyunOSSSTSToken: API_PREFIX + "/file_system/oss/sts",
    getBuiltInSTSToken: API_PREFIX + "/file_system/built-in/sts",
    getUserFileUrlPrefix: API_PREFIX + "/file_system/url-prefix",
}