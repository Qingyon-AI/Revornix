from protocol.notification_trigger import NotificationTriggerEventProtocol


class DocumentCommentedNotificationTriggerEvent(NotificationTriggerEventProtocol):

    def __init__(
        self
    ):
        super().__init__(
            uuid='bc665a75ead04dd9b12ce2f0bb6d5763',
            name="DocumentCommented",
            name_zh="文档被评论",
            description="When the document which you participate has been commented",
            description_zh="当你参与的文档被评论的时候"
        )
