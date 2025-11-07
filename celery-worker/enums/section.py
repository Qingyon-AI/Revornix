from enum import IntEnum

class UserSectionAuthority(IntEnum):
    FULL_ACCESS = 0
    READ_AND_WRITE = 1
    READ_ONLY = 2
    
class UserSectionRole(IntEnum):
    CREATOR = 0
    MEMBER = 1
    SUBSCRIBER = 2

class SectionDocumentIntegration(IntEnum):
    WAIT_TO = 0
    SUPPLEMENTING = 1
    SUCCESS = 2
    FAILED = 3

class SectionPodcastStatus(IntEnum):
    WAIT_TO = 0
    PROCESSING = 1
    SUCCESS = 2
    FAILED = 3