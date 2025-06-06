import { API_PREFIX } from "@/config/api"

export default {
    getWebsiteCrawlEngines: API_PREFIX + '/engine/website-crawl/search',
    getDocumentParseEngines: API_PREFIX + '/engine/document-parse/search',
}