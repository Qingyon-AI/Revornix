import json
from protocol.notification_target import NotificationTargetProvidedProtocol

class AppleNotificationTarget(NotificationTargetProvidedProtocol):
    
    def __init__(
        self
    ):
        super().__init__(
            uuid='66c8d221b2004fcbb18c8bc56bec6349',
            name='Apple APNS Target',
            name_zh='Apple APNS目标',
            description='The notification target which can be sent by Apple APNS',
            description_zh='Apple APNS可推送的目标',
            demo_config=json.dumps({
                'device_token': 'your_device_token',
            })
        )