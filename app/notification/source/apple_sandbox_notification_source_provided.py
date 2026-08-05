from protocol.notification_source import NotificationSourceProvidedProtocol
from enums.notification import NotificationCategory


class AppleSandBoxNotificationSourceProvided(NotificationSourceProvidedProtocol):

    def __init__(self):
        super().__init__(
            uuid='f5940f2602b14d31b40fb324e7b7df78',
            name='Apple APNS Source (SandBox)',
            name_zh='Apple APNS源（沙箱）',
            category=NotificationCategory.APPLE_SANDBOX.value,
            description='The source of notification based on Apple APNS service (SandBox)',
            description_zh='基于Apple提供的APNS服务的消息源（沙箱）'
        )
