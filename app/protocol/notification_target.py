class NotificationTargetProvidedProtocol():

    def __init__(
        self,
        uuid: str,
        name: str,
        name_zh: str,
        category: str,
        description: str | None,
        description_zh: str | None
    ):
        self.uuid = uuid
        self.name = name
        self.name_zh = name_zh
        self.category = category
        self.description = description
        self.description_zh = description_zh
