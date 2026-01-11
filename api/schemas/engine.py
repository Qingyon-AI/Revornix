from pydantic import BaseModel, field_serializer
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
    update_time: datetime | None
    @field_serializer("create_time")
    def serializer_create_time(self, v: datetime):
        if v.tzinfo is None:
            return v.replace(tzinfo=timezone.utc)  # 默认转换为 UTC
        return v
    @field_serializer("update_time")
    def serializer_update_time(self, v: datetime | None):
        if v is None:
            return None
        if v.tzinfo is None:
            return v.replace(tzinfo=timezone.utc)  # 默认转换为 UTC
        return v
    class Config:
        from_attributes = True
        
class EngineSearchRequest(BaseModel):
    keyword: str
    filter_category: int | None = None
    
class MineEngineSearchResponse(BaseModel):
    data: list[UserEngineInfo]
    
class ProvideEngineSearchResponse(BaseModel):
    data: list[EngineInfo]
    class Config:
        from_attributes = True