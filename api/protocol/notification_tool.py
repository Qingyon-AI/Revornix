import json
from typing import Any

class NotificationToolProtocol():
    
    def __init__(
        self,
        uuid: str,
        tool_name: str,
        tool_name_zh: str,
        channel_key: str,
        tool_description: str | None = None,
        tool_description_zh: str | None = None,
        notification_source_config: str | None = None,
        notification_target_config: str | None = None
    ):
        self.uuid = uuid
        self.tool_name = tool_name
        self.tool_name_zh = tool_name_zh
        self.channel_key = channel_key
        self.tool_description = tool_description
        self.tool_description_zh = tool_description_zh
        self.notification_source_config = notification_source_config
        self.notification_target_config = notification_target_config
        
    def set_source_config(
        self, 
        source_config: dict[str, Any]
    ):
        self.notification_source_config = json.dumps(source_config)

    def set_target_config(
        self, 
        target_config: dict[str, Any]
    ):
        self.notification_target_config = json.dumps(target_config)

    def get_source_config(
        self
    ) -> dict[str, Any]:
        if self.notification_source_config is None:
            raise ValueError("Source config is not set")
        return json.loads(self.notification_source_config)

    def get_target_config(
        self
    ) -> dict[str, Any]:
        if self.notification_target_config is None:
            raise ValueError("Target config is not set")
        return json.loads(self.notification_target_config)

    async def send_notification(
        self, 
        title: str,
        content: str | None = None,
        content_type: str | None = None,
        plain_content: str | None = None,
        cover: str | None = None,
        link: str | None = None
    ):
        raise NotImplementedError("Method not implemented")
