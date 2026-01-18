from protocol.notification_trigger import NotificationTriggerEventProtocol


class SectionUpdatedNotificationTriggerEvent(NotificationTriggerEventProtocol):

    def __init__(
        self
    ):
        super().__init__(
            uuid='97072bb797d148d2a1607f10cb1ebf83',
            name = "SectionUpdated",
            name_zh = "专栏更新",
            description = "When the section which you subscribe/participate has been updated",
            description_zh = "当你订阅/参与的专栏发生更新的时候"
        )
