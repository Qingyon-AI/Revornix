import mcpApi from '@/api/mcp'
import { MCPServerCreateRequest, MCPServerDeleteRequest, MCPServerDetailRequest, MCPServerInfo, MCPServerSearchRequest, MCPServerSearchResponse, MCPServerUpdateRequest, NormalResponse } from '@/generated'
import { request } from '@/lib/request'

export const createMCPServer = async (data: MCPServerCreateRequest): Promise<NormalResponse> => {
    return await request(mcpApi.createMCPServer, {
        data: data
    })
}

export const updateMCPServer = async (data: MCPServerUpdateRequest): Promise<NormalResponse> => {
    return await request(mcpApi.updateMCPServer, {
        data: data
    })
}

export const deleteMCPServer = async (data: MCPServerDeleteRequest): Promise<NormalResponse> => {
    return await request(mcpApi.deleteMCPServer, {
        data: data
    })
}

export const searchMCPServer = async (data: MCPServerSearchRequest): Promise<MCPServerSearchResponse> => {
    return await request(mcpApi.searchMCPServer, {
        data: data
    })
}

export const getMCPServerDetail = async (data: MCPServerDetailRequest): Promise<MCPServerInfo> => {
    return await request(mcpApi.getMCPServerDetail, {
        data
    })
}