from enum import IntEnum

class NotificationSourceCategory(IntEnum):
    EMAIL = 0
    IOS = 1
    IOS_SANDBOX = 2
    
class NotificationTargetCategory(IntEnum):
    EMAIL = 0
    IOS = 1
    
class NotificationContentType(IntEnum):
    CUSTOM = 0
    TEMPLATE = 1

class NotifyTemplate(IntEnum):
    DAILY_SUMMARY = 1