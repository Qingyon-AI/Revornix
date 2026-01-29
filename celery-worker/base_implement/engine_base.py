import json
from typing import Any

class EngineBase:

    def __init__(
        self,
        engine_uuid: str,
        engine_name: str,
        engine_name_zh: str,
        engine_category: int,
        engine_description: str | None = None,
        engine_description_zh: str | None = None,
        engine_demo_config: str | None = None,
        engine_config: str | None = None,
    ) -> None:
        self.engine_uuid = engine_uuid
        self.engine_name = engine_name
        self.engine_name_zh = engine_name_zh
        self.engine_category = engine_category
        self.engine_description = engine_description
        self.engine_description_zh = engine_description_zh
        self.engine_demo_config = engine_demo_config
        self.engine_config = engine_config
        self.user_id: int | None = None

    def get_engine_config(self) -> dict[str, Any] | None:
        if self.engine_config is None:
            return None
        return json.loads(self.engine_config)

    def set_engine_config(self, engine_config: dict[str, Any]) -> None:
        self.engine_config = json.dumps(engine_config)

    def set_user_id(self, user_id: int) -> None:
        self.user_id = user_id