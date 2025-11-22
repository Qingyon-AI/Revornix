from protocol.notification_trigger import NotificationTriggerEventProtocol

class SectionSubscribedNotificationTriggerEvent(NotificationTriggerEventProtocol):
    
    def __init__(
        self
    ):
        super().__init__(
            uuid='8c79f93f9dbd4b20bddb3c3a1bd57377',
            name = "SectionSubscribed",
            name_zh = "专栏被订阅",
            description = "When the section which you participate has been subscribed",
            description_zh = "当你参与的专栏被订阅的时候"
        )
