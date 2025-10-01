import graphApi from '@/api/graph'
import { GraphRequest, GraphResponse } from '@/generated'
import { request } from '@/lib/request'

export const searchGraph = async (data: GraphRequest): Promise<GraphResponse> => {
    return await request(graphApi.searchGraph, {
        data
    })
}
