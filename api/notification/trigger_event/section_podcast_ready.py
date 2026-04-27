from protocol.notification_trigger import NotificationTriggerEventProtocol


class SectionPodcastReadyNotificationTriggerEvent(NotificationTriggerEventProtocol):

    def __init__(
        self
    ):
        super().__init__(
            uuid='c4f8a2d6b1e34e7faab9c3d8e5f2a7b1',
            name = "SectionPodcastReady",
            name_zh = "专栏播客生成完成",
            description = "When the podcast generation for a section you participate in or created has finished",
            description_zh = "当你参与或创建的专栏播客生成完成的时候"
        )
