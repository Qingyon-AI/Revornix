from protocol.notification_trigger import NotificationTriggerEventProtocol


class SectionJoinRequestHandledNotificationTriggerEvent(NotificationTriggerEventProtocol):

    def __init__(
        self
    ):
        super().__init__(
            uuid='d7e2b8a4f1c3489abe5d6c8a9f0e3b21',
            name="SectionJoinRequestHandled",
            name_zh="专栏加入申请被处理",
            description="When your application to join a section has been approved or rejected",
            description_zh="当你申请加入专栏的请求被审批的时候"
        )
