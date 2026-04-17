from protocol.notification_trigger import NotificationTriggerEventProtocol


class SectionCommentedNotificationTriggerEvent(NotificationTriggerEventProtocol):

    def __init__(
        self
    ):
        super().__init__(
            uuid='2840a3b104124bd59afbae2a57c93dbf',
            name = "SectionCommented",
            name_zh = "专栏被评论",
            description = "When the section which you participate has been commented",
            description_zh = "当你参与的专栏被评论的时候"
        )
        self.attributes = [
            {"key": "section_id", "label": "Section ID", "label_zh": "专栏 ID", "value_type": "number", "required": True},
            {"key": "user_id", "label": "Receiver ID", "label_zh": "接收者 ID", "value_type": "number", "required": True},
        ]
