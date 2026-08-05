from protocol.notification_target import NotificationTargetProvidedProtocol
from enums.notification import NotificationCategory


class AppleSandBoxNotificationTargetProvided(NotificationTargetProvidedProtocol):

    def __init__(self):
        super().__init__(
            uuid='bd6ba0b72b9c4ffcb47e4fca32050c43',
            name='Apple APNS Target (SandBox)',
            name_zh='Apple APNS目标（沙箱）',
            category=NotificationCategory.APPLE_SANDBOX.value,
            description='The notification target which can be sent by Apple APNS (SandBox)',
            description_zh='Apple APNS可推送的目标（沙箱）'
        )
