from enum import IntEnum


class EngineBillingMode(IntEnum):
    TOKEN = 0
    REQUEST = 1
    FILE = 2
    PAGE = 3
    CHARACTER = 4
    SECOND = 5
    IMAGE = 6
