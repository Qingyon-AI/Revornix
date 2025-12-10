import OrderApi from '@/api/order'
import { request } from '@/lib/request'

interface OrderStatusResponse {
    status: number;
}

export const getOrderStatus = async (data: { order_no: string }): Promise<OrderStatusResponse> => {
    return await request(OrderApi.getOrderStatus, {
        data
    })
}
