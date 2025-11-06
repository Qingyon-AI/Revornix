from pydantic import BaseModel, field_validator
from datetime import datetime, timezone

class EngineDeleteRequest(BaseModel):
    user_engine_id: int

class EngineInstallRequest(BaseModel):
    engine_id: int
    title: str
    description: str | None = None
    config_json: str | None = None
    
class EngineInstallResponse(BaseModel):
    user_engine_id: int
    
class EngineUpdateRequest(BaseModel):
    user_engine_id: int
    config_json: str| None = None
    title: str | None = None
    description: str | None = None

class EngineInfo(BaseModel):
    id: int
    category: int
    name: str
    name_zh: str
    description: str | None = None
    description_zh: str | None = None
    demo_config: str | None = None
    class Config:
        from_attributes = True
        
class UserEngineInfo(BaseModel):
    id: int
    engine_id: int
    category: int
    title: str
    description: str | None = None
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
        
class EngineSearchRequest(BaseModel):
    keyword: str
    
class MineEngineSearchResponse(BaseModel):
    data: list[UserEngineInfo]
    
class ProvideEngineSearchResponse(BaseModel):
    data: list[EngineInfo]