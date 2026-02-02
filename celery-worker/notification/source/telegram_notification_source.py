import json
from protocol.notification_source import NotificationSourceProvidedProtocol

class TelegramNotificationSource(NotificationSourceProvidedProtocol):
    
    def __init__(
        self
    ):
        super().__init__(
            uuid='b8d1c80d974a468d8206b717f2ed02fc',
            name='Telegram Source',
            name_zh='Telegram源',
            description='The source of notification based on telegram',
            description_zh='基于Telegram的通知源',
            demo_config=json.dumps({
                'bot_token': '123456789:ABC-DEF1234ghIkl-zyx57W2v1u123ew11(This is not a real bot token)'
            })
        )