import json

from protocol.notification_source import NotificationSourceProtocol


class AppleSandBoxNotificationSource(NotificationSourceProtocol):

    def __init__(
        self
    ):
        super().__init__(
            uuid='f5940f2602b14d31b40fb324e7b7df78',
            name='Apple APNS Source (SandBox)',
            name_zh='Apple APNS源（沙箱）',
            description='The source of notification based on Apple APNS service (SandBox)',
            description_zh='基于Apple提供的APNS服务的消息源（沙箱）',
            demo_config=json.dumps({
                'team_id': 'your team_id',
                'key_id': 'your_key_id',
                'private_key': 'your_private_key',
                'apns_topic': 'your_apns_topic'
            })
        )
