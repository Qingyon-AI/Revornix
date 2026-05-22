from protocol.notification_trigger import NotificationTriggerEventProtocol


class DocumentJoinRequestedNotificationTriggerEvent(NotificationTriggerEventProtocol):

    def __init__(
        self
    ):
        super().__init__(
            uuid='f3b9d1c5a4e2476d92e8b1c7d3a5f6b4',
            name="DocumentJoinRequested",
            name_zh="文档被申请协作",
            description="When someone applies to collaborate on a document you own",
            description_zh="当有人申请加入你拥有的文档协作时"
        )
