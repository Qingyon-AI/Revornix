import json
from typing import Any

class NotificationToolProtocol():
    
    def __init__(
        self,
        notification_tool_uuid: str,
        notification_tool_name: str,
        notification_tool_name_zh: str,
        notification_tool_description: str | None = None,
        notification_tool_description_zh: str | None = None,
        notification_source_config: str | None = None,
        notification_target_config: str | None = None
    ):
        self.notification_tool_uuid = notification_tool_uuid
        self.notification_tool_name = notification_tool_name
        self.notification_tool_name_zh = notification_tool_name_zh
        self.notification_tool_description = notification_tool_description
        self.notification_tool_description_zh = notification_tool_description_zh
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
        cover: str | None = None,
        link: str | None = None
    ):
        raise NotImplementedError("Method not implemented")
