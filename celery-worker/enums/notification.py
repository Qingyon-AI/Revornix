from enum import Enum, IntEnum
from typing import NamedTuple

class UserNotificationSourceRole(IntEnum):
    CREATOR = 0
    FORKER = 1

class UserNotificationTargetRole(IntEnum):
    CREATOR = 0
    FORKER = 1

class NotificationTriggerEventUUID(Enum):
    REMOVED_FROM_SECTION = 'bf860113d5ee4486a23a6692888d27f3'
    SECTION_COMMENTED = '2840a3b104124bd59afbae2a57c93dbf'
    SECTION_UPDATED = '97072bb797d148d2a1607f10cb1ebf83'
    SECTION_SUBSCRIBED = '8c79f93f9dbd4b20bddb3c3a1bd57377'

class NotificationTriggerType(IntEnum):
    EVENT = 0
    SCHEDULER = 1

class NotificationContentType(IntEnum):
    CUSTOM = 0
    TEMPLATE = 1

class NotificationTemplateUUID(Enum):
    DAILY_SUMMARY = '8f5016dc375e447f82729df765b12847'
    SECTION_COMMENTED = '1ba024dfd7c249d8a09bb873dca708e6'
    SECTION_UPDATED = '4b655b12996540e1b6ee23d16a093bf6'
    SECTION_SUBSCRIBED = 'dd4726e202d543cd9eca59e2311d0f11'
    REMOVED_FROM_SECTION = '25a2b86e0ed24ef1964ea94d906ebbd7'

class NotificationSourceProvidedMeta(NamedTuple):
    uuid: str
    name: str

class NotificationSourceProvided(Enum):
    EMAIL = NotificationSourceProvidedMeta(
        uuid='0b15139f6f6d4c4fbf6fd1cbfa226f7e',
        name='Email',
    )
    APPLE = NotificationSourceProvidedMeta(
        uuid='163368273daf448b8ed7a4dac2950f89',
        name='Apple',
    )
    APPLE_SANDBOX = NotificationSourceProvidedMeta(
        uuid='f5940f2602b14d31b40fb324e7b7df78',
        name='Apple Sandbox',
    )
    FEISHU = NotificationSourceProvidedMeta(
        uuid='bbaea160e9084a04abdc12742110111e',
        name='Feishu',
    )
    DINGTALK = NotificationSourceProvidedMeta(
        uuid='e88984e3bb3745fbb42ea60b4167d3b5',
        name='Dingtalk',
    )
    TELEGRAM = NotificationSourceProvidedMeta(
        uuid='b8d1c80d974a468d8206b717f2ed02fc',
        name='Telegram',
    )

    @property
    def meta(self) -> NotificationSourceProvidedMeta:
        return self.value

class NotificationSourceMeta(NamedTuple):
    uuid: str
    name: str
    description: str
    notification_source_provided: NotificationSourceProvided


class NotificationSource(Enum):
    """Revornix官方管理员创建的通知渠道
    """
    Official_EMAIL = NotificationSourceMeta(
        uuid='657d7c9c2ec74a79bd2b19382c6aaaca',
        name='Official_EMAIL',
        description='',
        notification_source_provided=NotificationSourceProvided.EMAIL
    )
    Official_APPLE = NotificationSourceMeta(
        uuid='f3796e55279a4167ba0766e1c46f9ddf',
        name='Official_APPLE',
        description='',
        notification_source_provided=NotificationSourceProvided.APPLE
    )
    Official_APPLE_SANDBOX = NotificationSourceMeta(
        uuid='c9fcf491575b4d82960f34424ff774fb',
        name='Official_APPLE_SANDBOX',
        description='',
        notification_source_provided=NotificationSourceProvided.APPLE_SANDBOX
    )
    Official_FEISHU = NotificationSourceMeta(
        uuid='cac40e7ddc6441ae8d39b8ef129ba8b4',
        name='Official_FEISHU',
        description='',
        notification_source_provided=NotificationSourceProvided.FEISHU
    )
    Official_DINGTALK = NotificationSourceMeta(
        uuid='a8e9f5d8e7e547a7b5c6c7d8e9f5d8e7',
        name='Official_DINGTALK',
        description='',
        notification_source_provided=NotificationSourceProvided.DINGTALK
    )
    Official_TELEGRAM = NotificationSourceMeta(
        uuid='94f136520168412faab697b8046ee4ae',
        name='Official_TELEGRAM',
        description='',
        notification_source_provided=NotificationSourceProvided.TELEGRAM
    )

    @property
    def meta(self) -> NotificationSourceMeta:
        return self.value

class NotificationTargetProvidedMeta(NamedTuple):
    uuid: str
    name: str

class NotificationTargetProvided(Enum):
    EMAIL = NotificationTargetProvidedMeta(
        uuid='341ff369ce32418abb8b4f12ac607059',
        name='Email',
    )
    APPLE = NotificationTargetProvidedMeta(
        uuid='66c8d221b2004fcbb18c8bc56bec6349',
        name='Apple',
    )
    APPLE_SANDBOX = NotificationTargetProvidedMeta(
        uuid='bd6ba0b72b9c4ffcb47e4fca32050c43',
        name='Apple Sandbox',
    )
    FEISHU = NotificationTargetProvidedMeta(
        uuid='8bd9bceaa49c4fc4913c9a9c33bcbae2',
        name='Feishu',
    )
    DINGTALK = NotificationTargetProvidedMeta(
        uuid='affa4a24b2c94d67844902d27112e401',
        name='Dingtalk',
    )
    TELEGRAM = NotificationTargetProvidedMeta(
        uuid='e13a54b4ca8a49f48a542dd3de6f1e05',
        name='Telegram',
    )
    @property
    def meta(self) -> NotificationTargetProvidedMeta:
        return self.value

class NotificationTargetMeta(NamedTuple):
    uuid: str
    name: str
    description: str
    notification_target_provided: NotificationTargetProvidedMeta