from enum import IntEnum


class AccessRequestTargetType(IntEnum):
    SECTION = 0
    DOCUMENT = 1


class AccessRequestStatus(IntEnum):
    PENDING = 0
    APPROVED = 1
    REJECTED = 2
    CANCELLED = 3
