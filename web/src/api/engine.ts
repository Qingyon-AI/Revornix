import { API_PREFIX } from "@/config/api"

export default {
    getMineEngines: API_PREFIX + '/engine/mine',
    getProvideEngines: API_PREFIX + '/engine/provide',
    installEngine: API_PREFIX + '/engine/install',
    updateEngine: API_PREFIX + '/engine/update',
    deleteEngine: API_PREFIX + '/engine/delete',
}