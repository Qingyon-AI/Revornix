from enum import IntEnum, Enum

class NotificationTriggerType(IntEnum):
    EVENT = 0
    SCHEDULER = 1

class NotificationSourceUUID(Enum):
    EMAIL = '0b15139f6f6d4c4fbf6fd1cbfa226f7e'
    APPLE = '163368273daf448b8ed7a4dac2950f89'
    APPLE_SANDBOX = 'f5940f2602b14d31b40fb324e7b7df78'

class NotificationContentType(IntEnum):
    CUSTOM = 0
    TEMPLATE = 1

class NotifyTemplate(IntEnum):
    DAILY_SUMMARY = 1