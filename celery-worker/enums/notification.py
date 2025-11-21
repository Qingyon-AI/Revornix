from enum import IntEnum, Enum

class NotificationTriggerEventUUID(Enum):
    REMOVED_FROM_SECTION = 'bf860113d5ee4486a23a6692888d27f3'
    SECTION_COMMENTED = '2840a3b104124bd59afbae2a57c93dbf'
    SECTION_UPDATED = '97072bb797d148d2a1607f10cb1ebf83'

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

class NotificationTemplate(IntEnum):
    DAILY_SUMMARY = 1