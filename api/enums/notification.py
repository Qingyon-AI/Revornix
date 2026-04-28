from enum import Enum, IntEnum
from typing import NamedTuple

class NotificationCategory(str, Enum):
    EMAIL = 'email'
    APPLE = 'apple'
    APPLE_SANDBOX = 'apple_sandbox'
    FEISHU = 'feishu'
    DINGTALK = 'dingtalk'
    TELEGRAM = 'telegram'

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
    SECTION_CONTENT_UPDATED = '7a3c2f1e8d4b4a9eb3c8f2d6e4c1a9b0'
    SECTION_PODCAST_READY = 'c4f8a2d6b1e34e7faab9c3d8e5f2a7b1'
    SECTION_PPT_READY = '5b8e3d2c7a1f49a3b6c8d4e2f5a7b9c1'
    DOCUMENT_PROCESS_COMPLETED = '3e6b9a1c5d2847f0a8c4b7e9f2d3a4b5'
    DOCUMENT_PODCAST_READY = '8f1c4e6a9b3d4f7eb2a5c8d1e3f6a9b4'
    DOCUMENT_COMMENTED = 'bc665a75ead04dd9b12ce2f0bb6d5763'


class NotificationTemplateMeta(NamedTuple):
    uuid: str
    name: str

class NotificationTemplate(Enum):
    SECTION_COMMENTED = NotificationTemplateMeta(
        uuid='1ba024dfd7c249d8a09bb873dca708e6',
        name='Section Commented',
    )
    SECTION_UPDATED = NotificationTemplateMeta(
        uuid='4b655b12996540e1b6ee23d16a093bf6',
        name='Section Updated',
    )
    SECTION_SUBSCRIBED = NotificationTemplateMeta(
        uuid='dd4726e202d543cd9eca59e2311d0f11',
        name='Section Subscribed',
    )
    REMOVED_FROM_SECTION = NotificationTemplateMeta(
        uuid='25a2b86e0ed24ef1964ea94d906ebbd7',
        name='Removed From Section',
    )
    SECTION_CONTENT_UPDATED = NotificationTemplateMeta(
        uuid='9d7e5b2c4a3f4d8eb1c7e6d5a2b3f1e9',
        name='Section Content Updated',
    )
    SECTION_PODCAST_READY = NotificationTemplateMeta(
        uuid='e1d3b7c9a2f4456f8c5d6e7a8b9c0d1e',
        name='Section Podcast Ready',
    )
    SECTION_PPT_READY = NotificationTemplateMeta(
        uuid='f9a4c8e2d5b14f6dab7c2d3e8f1a5b6c',
        name='Section PPT Ready',
    )
    DOCUMENT_PROCESS_COMPLETED = NotificationTemplateMeta(
        uuid='2a7d4f1c6b3e495a9c8d3f2e1b6a5d4c',
        name='Document Process Completed',
    )
    DOCUMENT_PODCAST_READY = NotificationTemplateMeta(
        uuid='b6e3a8d2c5f147a9b1d4e7f3a2c5b8d6',
        name='Document Podcast Ready',
    )
    DOCUMENT_COMMENTED = NotificationTemplateMeta(
        uuid='04d4219387d24a559f2f2a01382a99a5',
        name='Document Commented',
    )

    @property
    def meta(self) -> NotificationTemplateMeta:
        return self.value

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
        description='The official email notification source provided by Revornix.',
        notification_source_provided=NotificationSourceProvided.EMAIL
    )
    Official_APPLE = NotificationSourceMeta(
        uuid='f3796e55279a4167ba0766e1c46f9ddf',
        name='Official_APPLE',
        description='The official Apple device notification source provided by Revornix.',
        notification_source_provided=NotificationSourceProvided.APPLE
    )
    Official_APPLE_SANDBOX = NotificationSourceMeta(
        uuid='c9fcf491575b4d82960f34424ff774fb',
        name='Official_APPLE_SANDBOX',
        description='The official Apple device (sandbox) notification source provided by Revornix.',
        notification_source_provided=NotificationSourceProvided.APPLE_SANDBOX
    )
    Official_FEISHU = NotificationSourceMeta(
        uuid='cac40e7ddc6441ae8d39b8ef129ba8b4',
        name='Official_FEISHU',
        description='The official Feishu notification source provided by Revornix.',
        notification_source_provided=NotificationSourceProvided.FEISHU
    )
    Official_DINGTALK = NotificationSourceMeta(
        uuid='a8e9f5d8e7e547a7b5c6c7d8e9f5d8e7',
        name='Official_DINGTALK',
        description='The official DingTalk notification source provided by Revornix.',
        notification_source_provided=NotificationSourceProvided.DINGTALK
    )
    Official_TELEGRAM = NotificationSourceMeta(
        uuid='94f136520168412faab697b8046ee4ae',
        name='Official_TELEGRAM',
        description='The official Telegram notification source provided by Revornix.',
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