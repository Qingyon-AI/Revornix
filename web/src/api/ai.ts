import { API_PREFIX } from "@/config/api"

export default {
    askAi: API_PREFIX + '/ai/ask',
    createAiModel: API_PREFIX + '/ai/model/create',
    createAiModelProvider: API_PREFIX + '/ai/model-provider/create',
    deleteAiModel: API_PREFIX + '/ai/model/delete',
    deleteAiModelProvider: API_PREFIX + '/ai/model-provider/delete',
    searchAiModel: API_PREFIX + '/ai/model/search',
    searchAiModelProvider: API_PREFIX + '/ai/model-provider/search',
    updateAiModel: API_PREFIX + '/ai/model/update',
    updateAiModelProvider: API_PREFIX + '/ai/model-provider/update',
    getAiModelDetail: API_PREFIX + '/ai/model/detail',
    getAiModelProviderDetail: API_PREFIX + '/ai/model-provider/detail',
} 