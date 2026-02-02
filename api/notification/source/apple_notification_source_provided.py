import json

from protocol.notification_source import NotificationSourceProvidedProtocol


class AppleNotificationSourceProvided(NotificationSourceProvidedProtocol):

    def __init__(
        self
    ):
        super().__init__(
            uuid='163368273daf448b8ed7a4dac2950f89',
            name='Apple APNS Source',
            name_zh='Apple APNS源',
            description='The source of notification based on Apple APNS service',
            description_zh='基于Apple提供的APNS服务的消息源',
            demo_config=json.dumps({
                'team_id': 'your team_id',
                'key_id': 'your_key_id',
                'private_key': 'your_private_key',
                'apns_topic': 'your_apns_topic'
            })
        )
