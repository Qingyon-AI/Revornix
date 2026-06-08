from protocol.notification_trigger import NotificationTriggerEventProtocol

class SectionUpdatedNotificationTriggerEvent(NotificationTriggerEventProtocol):
    
    def __init__(
        self
    ):
        super().__init__(
            uuid='97072bb797d148d2a1607f10cb1ebf83',
            name = "SectionProcessCompleted",
            name_zh = "专栏处理完成",
            description = "When the processing of a section you created/participate in/subscribe to has completed",
            description_zh = "当你创建/参与/订阅的专栏处理完成的时候"
        )
