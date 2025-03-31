import { API_PREFIX } from "@/config/api"

export default {
    getDayDocumentSummarySection: API_PREFIX + "/section/date",
    searchMySection: API_PREFIX + "/section/mine/search",
    searchUserSection: API_PREFIX + "/section/user/search",
    searchPublicSection: API_PREFIX + "/section/public/search",
    createSection: API_PREFIX + "/section/create",
    deleteSection: API_PREFIX + "/section/delete",
    getAllMineSections: API_PREFIX + "/section/mine/all",
    getSectionDetail: API_PREFIX + "/section/detail",
    updateSection: API_PREFIX + "/section/update",
    subscribeSection: API_PREFIX + "/section/subscribe",
    createComment: API_PREFIX + "/section/comment/create",
    deleteComment: API_PREFIX + "/section/comment/delete",
    searchComment: API_PREFIX + "/section/comment/search",
    mySubscribedSecitions: API_PREFIX + "/section/subscribed",
    createLabel: API_PREFIX + "/section/label/create",
    getMineLabels: API_PREFIX + "/section/label/list",
}