from protocol.notification_trigger import NotificationTriggerEventProtocol

class RemovedFromSectionNotificationTriggerEvent(NotificationTriggerEventProtocol):
    
    def __init__(
        self
    ):
        super().__init__(
            uuid='bf860113d5ee4486a23a6692888d27f3',
            name = "RemovedFromSection",
            name_zh = "被移出专栏",
            description = "When you are removed from a section.",
            description_zh = "当您被移出专栏时。"
        )
