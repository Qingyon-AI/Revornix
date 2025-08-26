from enum import IntEnum

class UserSectionAuthority(IntEnum):
    FULL_ACCESS = 0
    READ_AND_WRITE = 1
    READ_ONLY = 2