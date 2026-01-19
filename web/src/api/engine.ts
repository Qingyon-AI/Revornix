import { API_PREFIX } from "@/config/api"

export default {
    getEngineDetail: API_PREFIX + '/engine/detail',
    searchUsableEngines: API_PREFIX + '/engine/usable',
    searchCommunityEngines: API_PREFIX + '/engine/community',
    forkEngine: API_PREFIX + '/engine/fork',
    createEngine: API_PREFIX + '/engine/create',
    updateEngine: API_PREFIX + '/engine/update',
    deleteEngine: API_PREFIX + '/engine/delete',
    getProvidedEngines: API_PREFIX + '/engine/provided',
}