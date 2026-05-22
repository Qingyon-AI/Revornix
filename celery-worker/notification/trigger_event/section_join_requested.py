from protocol.notification_trigger import NotificationTriggerEventProtocol


class SectionJoinRequestedNotificationTriggerEvent(NotificationTriggerEventProtocol):

    def __init__(
        self
    ):
        super().__init__(
            uuid='a1c4f5e8b2d9472d8e6a3b9c7d1f4e0a',
            name="SectionJoinRequested",
            name_zh="专栏被申请加入",
            description="When someone applies to join the section you manage",
            description_zh="当有人申请加入你管理的专栏的时候"
        )
