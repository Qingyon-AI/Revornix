from protocol.notification_source import NotificationSourceProvidedProtocol
from enums.notification import NotificationCategory


class AppleNotificationSourceProvided(NotificationSourceProvidedProtocol):

    def __init__(self):
        super().__init__(
            uuid='163368273daf448b8ed7a4dac2950f89',
            name='Apple APNS Source',
            name_zh='Apple APNS源',
            category=NotificationCategory.APPLE.value,
            description='The source of notification based on Apple APNS service',
            description_zh='基于Apple提供的APNS服务的消息源'
        )
