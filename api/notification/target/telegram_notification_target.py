import json
from protocol.notification_target import NotificationTargetProtocol

class TelegramNotificationTarget(NotificationTargetProtocol):
    
    def __init__(
        self
    ):
        super().__init__(
            uuid='e13a54b4ca8a49f48a542dd3de6f1e05',
            name='Telegram Target',
            name_zh='Telegram目标',
            description='The target of notification based on telegram',
            description_zh='基于Telegram的通知目标',
            demo_config=json.dumps({
                'chat_id': "1234567890"
            })
        )