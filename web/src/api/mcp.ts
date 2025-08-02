import { API_PREFIX } from "@/config/api"

export default {
    createMCPServer: API_PREFIX + '/mcp/server/create',
    updateMCPServer: API_PREFIX + '/mcp/server/update',
    deleteMCPServer: API_PREFIX + '/mcp/server/delete',
    searchMCPServer: API_PREFIX + '/mcp/server/search',
    getMCPServerDetail: API_PREFIX + '/mcp/server/detail',
}