import json
from protocol.notification_source import NotificationSourceProvidedProtocol

class EmailNotificationSource(NotificationSourceProvidedProtocol):
    
    def __init__(
        self
    ):
        super().__init__(
            uuid='0b15139f6f6d4c4fbf6fd1cbfa226f7e',
            name='Email Source',
            name_zh='邮件源',
            description='The source of notification based on third-party email server',
            description_zh='基于第三方邮件服务器来发送消息的消息源',
            demo_config=json.dumps({
                'host': 'smtp.example.com',
                'port': 587,
                'username': 'your_email@example.com',
                'password': 'your_password'
            })
        )