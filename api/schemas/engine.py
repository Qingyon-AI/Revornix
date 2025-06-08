from pydantic import BaseModel, field_validator
from datetime import datetime, timezone

class EngineInstallRequest(BaseModel):
    engine_id: int
    status: bool
    
class EngineUpdateRequest(BaseModel):
    engine_id: int
    config_json: str

class EngineInfo(BaseModel):
    id: int
    name: str
    description: str | None = None
    create_time: datetime
    update_time: datetime
    enable: bool | None = None
    config_json: str | None = None

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
    
class EngineSearchResponse(BaseModel):
    data: list[EngineInfo]