import json
from typing import Any

from common.engine_concurrency import acquire_engine_slot

class EngineBase:

    def __init__(
        self,
        engine_uuid: str,
        engine_name: str,
        engine_name_zh: str,
        engine_category: int,
        engine_description: str | None = None,
        engine_description_zh: str | None = None,
        engine_config: str | None = None,
    ) -> None:
        self.engine_uuid = engine_uuid
        self.engine_name = engine_name
        self.engine_name_zh = engine_name_zh
        self.engine_category = engine_category
        self.engine_description = engine_description
        self.engine_description_zh = engine_description_zh
        self.engine_config = engine_config
        self.user_id: int | None = None
        self.resource_uuid: str | None = None
        self.concurrency_queue_key: str | None = None
        self.max_concurrency: int = 3

    def get_engine_config(self) -> dict[str, Any] | None:
        if self.engine_config is None:
            return None
        return json.loads(self.engine_config)

    def set_engine_config(self, engine_config: dict[str, Any]) -> None:
        self.engine_config = json.dumps(engine_config)

    def set_user_id(self, user_id: int) -> None:
        self.user_id = user_id

    def set_resource_uuid(self, resource_uuid: str) -> None:
        self.resource_uuid = resource_uuid

    def set_concurrency_control(self, *, queue_key: str, max_concurrency: int) -> None:
        self.concurrency_queue_key = queue_key
        self.max_concurrency = max(1, int(max_concurrency))

    async def run_with_concurrency_limit(
        self,
        operation: Any,
    ) -> Any:
        if not self.concurrency_queue_key:
            return await operation()
        async with acquire_engine_slot(
            queue_key=self.concurrency_queue_key,
            limit=self.max_concurrency,
        ):
            return await operation()
