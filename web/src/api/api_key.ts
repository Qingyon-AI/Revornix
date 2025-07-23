import { API_PREFIX } from "@/config/api"

export default {
    createApiKey: API_PREFIX + '/api-key/create',
    deleteApiKey: API_PREFIX + '/api-key/delete',
    searchApiKey: API_PREFIX + '/api-key/search'
}