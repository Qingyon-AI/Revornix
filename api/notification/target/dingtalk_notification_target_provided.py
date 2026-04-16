from protocol.notification_target import NotificationTargetProvidedProtocol
from enums.notification import NotificationCategory


class DingTalkNotificationTargetProvided(NotificationTargetProvidedProtocol):

    def __init__(self):
        super().__init__(
            uuid='affa4a24b2c94d67844902d27112e401',
            name='DingTalk Target',
            name_zh='钉钉机器人目标',
            category=NotificationCategory.DINGTALK.value,
            description='The target of notification based on dingtalk webhook',
            description_zh='基于钉钉的机器人通知目标'
        )
