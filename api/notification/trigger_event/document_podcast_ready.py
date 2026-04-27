from protocol.notification_trigger import NotificationTriggerEventProtocol


class DocumentPodcastReadyNotificationTriggerEvent(NotificationTriggerEventProtocol):

    def __init__(
        self
    ):
        super().__init__(
            uuid='8f1c4e6a9b3d4f7eb2a5c8d1e3f6a9b4',
            name = "DocumentPodcastReady",
            name_zh = "文档播客生成完成",
            description = "When the podcast generation for a document has finished",
            description_zh = "当文档播客生成完成的时候"
        )
