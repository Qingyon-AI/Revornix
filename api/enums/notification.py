from enum import IntEnum

class NotificationSourceCategory(IntEnum):
    EMAIL = 0
    IOS = 1
    
class NotificationTargetCategory(IntEnum):
    EMAIL = 0
    IOS = 1
    
class NotificationContentType(IntEnum):
    CUSTOM = 0
    TEMPLATE = 1