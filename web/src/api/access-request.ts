import { API_PREFIX } from "@/config/api"

export default {
    create: API_PREFIX + "/access-request/create",
    list: API_PREFIX + "/access-request/list",
    mine: API_PREFIX + "/access-request/mine",
    handle: API_PREFIX + "/access-request/handle",
    cancel: API_PREFIX + "/access-request/cancel",
}
