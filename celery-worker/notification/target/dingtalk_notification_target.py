import json
from protocol.notification_target import NotificationTargetProvidedProtocol

class DingTalkNotificationTarget(NotificationTargetProvidedProtocol):
    
    def __init__(
        self
    ):
        super().__init__(
            uuid='affa4a24b2c94d67844902d27112e401',
            name='DingTalk Target',
            name_zh='钉钉机器人目标',
            description='The target of notification based on dingtalk webhook',
            description_zh='基于钉钉的机器人通知目标',
            demo_config=json.dumps({
                'webhook_url': 'https://open.feishu.cn/open-apis/bot/v2/hook/xxxxxxxxxxxxxxxxxxxxx',
                "sign": 'xxxxxxxxx'
            })
        )