import { API_PREFIX } from "@/config/api"

export default {
    getMineFileSystems: API_PREFIX + '/file_system/mine',
    getProvideFileSystems: API_PREFIX + '/file_system/provide',
    installFileSystem: API_PREFIX + '/file_system/install',
    updateFileSystem: API_PREFIX + '/file_system/update'
}