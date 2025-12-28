import { UNION_PAY_API_PREFIX } from "@/config/api"

export default {
    getOrderStatus: UNION_PAY_API_PREFIX + '/order/status',
    getOrderDetailByPaypalOrder: UNION_PAY_API_PREFIX + '/order/detail/paypal'
} 