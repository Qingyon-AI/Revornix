import { API_PREFIX } from "@/config/api"

export default {
    createApiKey: API_PREFIX + '/api_key/create',
    deleteApiKey: API_PREFIX + '/api_key/delete',
    searchApiKey: API_PREFIX + '/api_key/search'
}