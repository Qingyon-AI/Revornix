import json
from protocol.notification_source import NotificationSourceProvidedProtocol

class FeishuNotificationTarget(NotificationSourceProvidedProtocol):
    
    def __init__(
        self
    ):
        super().__init__(
            uuid='8bd9bceaa49c4fc4913c9a9c33bcbae2',
            name='Feishu Target',
            name_zh='飞书机器人目标',
            description='The target of notification based on feishu webhook',
            description_zh='基于飞书的机器人通知目标',
            demo_config=json.dumps({
                'webhook_url': 'https://open.feishu.cn/open-apis/bot/v2/hook/xxxxxxxxxxxxxxxxxxxxx',
                "sign": 'xxxxxxxxx'
            })
        )