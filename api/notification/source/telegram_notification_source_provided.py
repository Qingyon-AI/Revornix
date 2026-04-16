from protocol.notification_source import NotificationSourceProvidedProtocol
from enums.notification import NotificationCategory


class TelegramNotificationSourceProvided(NotificationSourceProvidedProtocol):

    def __init__(self):
        super().__init__(
            uuid='b8d1c80d974a468d8206b717f2ed02fc',
            name='Telegram Source',
            name_zh='Telegram源',
            category=NotificationCategory.TELEGRAM.value,
            description='The source of notification based on telegram',
            description_zh='基于Telegram的通知源'
        )
