from pydantic import BaseModel, field_validator
from datetime import datetime, timezone

class EngineInfo(BaseModel):
    id: int
    name: str
    name_zh: str
    description: str | None = None
    description_zh: str | None = None
    demo_config: str | None = None
    class Config:
        from_attributes = True
        
class UserEngineInfo(BaseModel):
    id: int
    name: str
    name_zh: str
    description: str | None = None
    description_zh: str | None = None
    demo_config: str | None = None
    enable: bool | None = None
    config_json: str | None = None
    create_time: datetime
    update_time: datetime
    @field_validator("create_time", mode="before")
    def ensure_create_timezone(cls, v: datetime) -> datetime:
        if v.tzinfo is None:
            return v.replace(tzinfo=timezone.utc)  # 默认转换为 UTC
        return v
    @field_validator("update_time", mode="before")
    def ensure_update_timezone(cls, v: datetime) -> datetime:
        if v.tzinfo is None:
            return v.replace(tzinfo=timezone.utc)  # 默认转换为 UTC
        return v
    class Config:
        from_attributes = True