import { API_PREFIX } from "@/config/api"

export default {
    createDocument: API_PREFIX + '/document/create',
    createLabel: API_PREFIX + '/document/label/create',
    listLabel: API_PREFIX + '/document/label/list',
    searchUserUnreadDocument: API_PREFIX + '/document/unread/search',
    searchUserRecentReadDocument: API_PREFIX + '/document/recent/search',
    documentDetail: API_PREFIX + '/document/detail',
    starDocument: API_PREFIX + '/document/star',
    readDocument: API_PREFIX + '/document/read',
    deleteDocument: API_PREFIX + '/document/delete',
    searchMyDocuments: API_PREFIX + '/document/search/mine',
    searchStarDocument: API_PREFIX + '/document/star/search',
    searchDocumentVector: API_PREFIX + '/document/vector/search',
    summaryMonthDocumentCount: API_PREFIX + '/document/month/summary',
    searchDocumentNotes: API_PREFIX + '/document/note/search',
    createDocumentNote: API_PREFIX + '/document/note/create',
    deleteDocumentNotes: API_PREFIX + '/document/note/delete',
    transformToMarkdown: API_PREFIX + '/document/markdown/transform',
    summaryContent: API_PREFIX + '/document/ai/summary',
    getDocumentLabelSummary: API_PREFIX + '/document/label/summary'
} 