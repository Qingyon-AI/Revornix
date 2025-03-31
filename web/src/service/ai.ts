import aiApi from '@/api/ai'
import { ChatMessages } from '@/generated'
import { request } from '@/lib/request'

export const askAi = async (data: ChatMessages) => {
    return await request(aiApi.askAi, {
        data: data
    })
}
