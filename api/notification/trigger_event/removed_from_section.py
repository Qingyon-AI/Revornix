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
        self.attributes = [
            {"key": "section_id", "label": "Section ID", "label_zh": "专栏 ID", "value_type": "number", "required": True},
            {"key": "user_id", "label": "Receiver ID", "label_zh": "接收者 ID", "value_type": "number", "required": True},
        ]
