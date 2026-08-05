from typing import Protocol


class NotificationTriggerEventProtocol(Protocol):

    uuid: str
    name: str
    name_zh: str
    description: str | None
    description_zh: str | None

    def __init__(
        self,
        uuid: str,
        name: str,
        name_zh: str,
        description: str | None = None,
        description_zh: str | None = None,
    ):
        self.uuid = uuid
        self.name = name
        self.name_zh = name_zh
        self.description = description
        self.description_zh = description_zh
