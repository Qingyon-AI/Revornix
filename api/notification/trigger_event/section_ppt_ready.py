from protocol.notification_trigger import NotificationTriggerEventProtocol


class SectionPptReadyNotificationTriggerEvent(NotificationTriggerEventProtocol):

    def __init__(
        self
    ):
        super().__init__(
            uuid='5b8e3d2c7a1f49a3b6c8d4e2f5a7b9c1',
            name = "SectionPptReady",
            name_zh = "专栏 PPT 生成完成",
            description = "When the PPT generation for a section you participate in or created has finished",
            description_zh = "当你参与或创建的专栏 PPT 生成完成的时候"
        )
