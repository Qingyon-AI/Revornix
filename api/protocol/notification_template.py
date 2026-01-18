from typing import Protocol

import schemas


class NotificationTemplate(Protocol):

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
        description_zh: str | None = None
    ):
        self.uuid = uuid
        self.name = name
        self.description = description
        self.name_zh = name_zh
        self.description_zh = description_zh

    async def generate(
        self,
        params: dict | None
    ) -> schemas.notification.Message:
        raise NotImplementedError("Not implemented")
