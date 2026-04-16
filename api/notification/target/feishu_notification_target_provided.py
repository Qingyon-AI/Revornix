from protocol.notification_target import NotificationTargetProvidedProtocol
from enums.notification import NotificationCategory


class FeishuNotificationTargetProvided(NotificationTargetProvidedProtocol):

    def __init__(self):
        super().__init__(
            uuid='8bd9bceaa49c4fc4913c9a9c33bcbae2',
            name='Feishu Target',
            name_zh='飞书机器人目标',
            category=NotificationCategory.FEISHU.value,
            description='The target of notification based on feishu webhook',
            description_zh='基于飞书的机器人通知目标'
        )
