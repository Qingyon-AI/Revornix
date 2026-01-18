from enum import Enum, IntEnum


class NotificationTriggerEventUUID(Enum):
    REMOVED_FROM_SECTION = 'bf860113d5ee4486a23a6692888d27f3'
    SECTION_COMMENTED = '2840a3b104124bd59afbae2a57c93dbf'
    SECTION_UPDATED = '97072bb797d148d2a1607f10cb1ebf83'
    SECTION_SUBSCRIBED = '8c79f93f9dbd4b20bddb3c3a1bd57377'

class NotificationTriggerType(IntEnum):
    EVENT = 0
    SCHEDULER = 1

class NotificationSourceUUID(Enum):
    EMAIL = '0b15139f6f6d4c4fbf6fd1cbfa226f7e'
    APPLE = '163368273daf448b8ed7a4dac2950f89'
    APPLE_SANDBOX = 'f5940f2602b14d31b40fb324e7b7df78'
    FEISHU = 'bbaea160e9084a04abdc12742110111e'
    DINGTALK = 'e88984e3bb3745fbb42ea60b4167d3b5'
    TELEGRAM = 'b8d1c80d974a468d8206b717f2ed02fc'

class NotificationContentType(IntEnum):
    CUSTOM = 0
    TEMPLATE = 1

class NotificationTemplateUUID(Enum):
    DAILY_SUMMARY = '8f5016dc375e447f82729df765b12847'
    SECTION_COMMENTED = '1ba024dfd7c249d8a09bb873dca708e6'
    SECTION_UPDATED = '4b655b12996540e1b6ee23d16a093bf6'
    SECTION_SUBSCRIBED = 'dd4726e202d543cd9eca59e2311d0f11'
    REMOVED_FROM_SECTION = '25a2b86e0ed24ef1964ea94d906ebbd7'
