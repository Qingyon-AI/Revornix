from protocol.notification_source import NotificationSourceProtocol


class DingTalkNotificationSource(NotificationSourceProtocol):

    def __init__(
        self
    ):
        super().__init__(
            uuid='e88984e3bb3745fbb42ea60b4167d3b5',
            name='DingTalk Source',
            name_zh='飞书源',
            description='The source of notification based on dingtalk webhook',
            description_zh='基于钉钉的Webhook通知源'
        )
