from protocol.notification_trigger import NotificationTriggerEventProtocol


class DocumentJoinRequestHandledNotificationTriggerEvent(NotificationTriggerEventProtocol):

    def __init__(
        self
    ):
        super().__init__(
            uuid='6c1d8f3b9a4e472f8b5c2e7d9a1f3b6e',
            name="DocumentJoinRequestHandled",
            name_zh="文档协作申请被处理",
            description="When your application to collaborate on a document has been approved or rejected",
            description_zh="当你申请加入文档协作的请求被审批的时候"
        )
