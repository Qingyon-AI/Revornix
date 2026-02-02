import json
from protocol.notification_target import NotificationTargetProvidedProtocol

class AppleSandBoxNotificationTarget(NotificationTargetProvidedProtocol):
    
    def __init__(
        self
    ):
        super().__init__(
            uuid='bd6ba0b72b9c4ffcb47e4fca32050c43',
            name='Apple APNS Target (SandBox)',
            name_zh='Apple APNS目标（沙箱）',
            description='The notification target which can be sent by Apple APNS (SandBox)',
            description_zh='Apple APNS可推送的目标（沙箱）',
            demo_config=json.dumps({
                'device_token': 'your_device_token',
            })
        )