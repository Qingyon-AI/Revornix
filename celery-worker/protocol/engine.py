from typing import Protocol, Any

class EngineProtocol(Protocol):
    engine_uuid: str
    engine_name: str
    engine_name_zh: str
    engine_category: int
    engine_description: str | None
    engine_description_zh: str | None
    engine_demo_config: str | None
    engine_config: str | None
    user_id: int | None

    def get_engine_config(self) -> dict[str, Any] | None: ...
    def set_engine_config(self, engine_config: dict[str, Any]) -> None: ...
    def set_user_id(self, user_id: int) -> None: ...