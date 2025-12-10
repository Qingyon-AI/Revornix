import { UNION_PAY_API_PREFIX } from "@/config/api"

export default {
    prePayProduct: UNION_PAY_API_PREFIX + '/product/prepay',
    getProductDetail: UNION_PAY_API_PREFIX + '/product/detail',
    getProductAbilities: UNION_PAY_API_PREFIX + '/product/ability/list',
} 