import rssApi from '@/api/rss'
import { AddRssServerRequest, AddRssServerResponse, DeleteRssServerRequest, InifiniteScrollPagnitionRssServerInfo, NormalResponse, SearchRssServerRequest } from '@/generated'
import { request } from '@/lib/request'

export const createRssServer = async (data: AddRssServerRequest): Promise<AddRssServerResponse> => {
    return await request(rssApi.createRssServer, {
        data: data
    })
}

export const deleteRssServer = async (data: DeleteRssServerRequest): Promise<NormalResponse> => {
    return await request(rssApi.deleteRssServer, {
        data
    })
}

export const searchMineRssServer = async (data: SearchRssServerRequest): Promise<InifiniteScrollPagnitionRssServerInfo> => {
    return await request(rssApi.searchMineRssServer, {
        data
    })
}