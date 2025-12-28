export enum PayStatus {
    SUCCESS = 0, // 支付成功
    REFUNDED = 1, // 微信一侧的转入退款
    NOTPAY = 2, // 等待支付
    CLOSED = 3, // 超时关闭或者支付后全额退款
    FINISHED = 4, // 支付宝一侧的交易结束，不可退款
    USERPAYING = 5, // 微信一侧用户支付中（仅付款码支付会返回）
    REVOKED = 6, // 微信一侧已撤销（仅付款码支付会返回）
    PAYERROR = 7, // 微信一侧支付失败（仅付款码支付会返回）

    CREATED = 9, // PayPal 订单已创建，用户尚未支付
    SAVED = 10, // PayPal 订单已保存，支付未完成
    APPROVED = 11, // PayPal 用户已同意支付，可能尚未扣款
    VOIDED = 12, // PayPal 订单已作废
    COMPLETED = 13, // PayPal 支付完成
    PAYER_ACTION_REQUIRED = 14, // PayPal 需要用户额外操作（3DS / 验证等）
}