import json

from protocol.notification_target import NotificationTargetProvidedProtocol


class EmailNotificationTargetProvided(NotificationTargetProvidedProtocol):

    def __init__(
        self
    ):
        super().__init__(
            uuid='341ff369ce32418abb8b4f12ac607059',
            name='Email Target',
            name_zh='邮件目标',
            description='The notification target which can be sent email',
            description_zh='可以被邮件服务器发送邮件的消息目标',
            demo_config=json.dumps({
                'email': 'your_email@example.com',
            })
        )
