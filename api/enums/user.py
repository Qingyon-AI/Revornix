from enum import IntEnum

class WeChatUserSource(IntEnum):
    UNKNOWN = 0
    REVORNIX_WEB_APP = 1
    REVORNIX_MINI_PROGRAM = 2
    
class MarkDocumentReadReason(IntEnum):
    REQUEST_ONCE = 0
    SCROLL_TO_BOTTOM = 1
    MANUAL_MARK = 2
