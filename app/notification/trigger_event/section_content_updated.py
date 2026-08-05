from protocol.notification_trigger import NotificationTriggerEventProtocol


class SectionContentUpdatedNotificationTriggerEvent(NotificationTriggerEventProtocol):

    def __init__(
        self
    ):
        super().__init__(
            uuid='7a3c2f1e8d4b4a9eb3c8f2d6e4c1a9b0',
            name = "SectionContentUpdated",
            name_zh = "专栏内容被编辑",
            description = "When the section which you participate in or subscribe to has its metadata edited",
            description_zh = "当你参与或订阅的专栏的标题、描述、封面或标签被编辑的时候"
        )
