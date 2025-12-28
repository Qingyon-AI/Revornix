import OrderApi from '@/api/order'
import { GetOrderDetailByPaypalOrderRequestDTO, GetOrderDetailResponseDTO, OrderStatusRequestDTO, OrderStatusResponseDTO } from '@/generated-pay';
import { request } from '@/lib/request'


export const getOrderStatus = async (data: OrderStatusRequestDTO): Promise<OrderStatusResponseDTO> => {
    return await request(OrderApi.getOrderStatus, {
        data
    })
}

export const getOrderDetailByPaypalOrder = async (data: GetOrderDetailByPaypalOrderRequestDTO): Promise<GetOrderDetailResponseDTO> => {
    return await request(OrderApi.getOrderDetailByPaypalOrder, {
        data
    })
}