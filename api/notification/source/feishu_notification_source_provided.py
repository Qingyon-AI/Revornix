from protocol.notification_source import NotificationSourceProvidedProtocol
from enums.notification import NotificationCategory


class FeishuNotificationSourceProvided(NotificationSourceProvidedProtocol):

    def __init__(self):
        super().__init__(
            uuid='bbaea160e9084a04abdc12742110111e',
            name='Feishu Source',
            name_zh='飞书源',
            category=NotificationCategory.FEISHU.value,
            description='The source of notification based on feishu webhook',
            description_zh='基于飞书的Webhook通知源'
        )
