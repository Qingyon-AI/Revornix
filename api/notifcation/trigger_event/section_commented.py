from protocol.notification_trigger import NotificationTriggerEventProtocol

class SectionCommentedNotificationTriggerEvent(NotificationTriggerEventProtocol):
    
    def __init__(
        self
    ):
        super().__init__(
            uuid='2840a3b104124bd59afbae2a57c93dbf',
            name = "SectionCommented",
            name_zh = "专栏被评论",
            description = "When the section which you subscribe/participate has been commented",
            description_zh = "当你订阅/参与的专栏被评论的时候"
        )
