import { API_PREFIX } from "@/config/api"

export default {
    createRssServer: API_PREFIX + '/rss/add',
    deleteRssServer: API_PREFIX + '/rss/delete',
    searchMineRssServer: API_PREFIX + '/rss/search',
    updateRssServer: API_PREFIX + '/rss/update',
    getRssServerDetail: API_PREFIX + '/rss/detail',
    searchRssDocuments: API_PREFIX + '/rss/document',
}