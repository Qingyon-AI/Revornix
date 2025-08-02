import rssApi from '@/api/rss'
import { AddRssServerRequest, AddRssServerResponse, DeleteRssServerRequest, GetRssServerDetailRequest, InifiniteScrollPagnitionRssServerInfo, NormalResponse, RssServerInfo, SearchRssServerRequest, UpdateRssServerRequest } from '@/generated'
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

export const updateRssServer = async (data: UpdateRssServerRequest): Promise<NormalResponse> => {
    return await request(rssApi.updateRssServer, {
        data
    })
}

export const getRssServerDetail = async (data: GetRssServerDetailRequest): Promise<RssServerInfo> => {
    return await request(rssApi.getRssServerDetail, {
        data
    })
}