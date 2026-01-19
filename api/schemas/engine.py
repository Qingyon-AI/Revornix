from datetime import datetime, timezone

from pydantic import BaseModel, field_serializer

from .user import UserPublicInfo

class EngineProvidedInfo(BaseModel):
    id: int
    category: int
    name: str
    name_zh: str
    description: str | None = None
    description_zh: str | None = None
    demo_config: str | None = None
    class Config:
        from_attributes = True

class EngineProvidedSearchRequest(BaseModel):
    keyword: str
    filter_category: int | None = None

class EngineProvidedSearchResponse(BaseModel):
    data: list[EngineProvidedInfo]
    class Config:
        from_attributes = True

class EngineCreateRequest(BaseModel):
    name: str
    description: str | None = None
    is_public: bool
    engine_provided_id: int
    config_json: str | None = None

class EngineDetailRequest(BaseModel):
    engine_id: int

class EngineDetail(BaseModel):
    id: int
    uuid: str
    category: int
    name: str
    description: str | None = None
    is_public: bool
    create_time: datetime
    update_time: datetime | None = None
    config_json: str | None = None
    creator: UserPublicInfo
    engine_provided: EngineProvidedInfo

    @field_serializer("create_time")
    def serializer_create_timezone(self, v: datetime):
        if v.tzinfo is None:
            return v.replace(tzinfo=timezone.utc)  # 默认转换为 UTC
        return v
    @field_serializer("update_time")
    def serializer_update_timezone(self, v: datetime | None):
        if v is None:
            return None
        if v.tzinfo is None:
            return v.replace(tzinfo=timezone.utc)  # 默认转换为 UTC
        return v

    class Config:
        from_attributes = True
        
class EngineBaseInfo(BaseModel):
    id: int
    uuid: str
    name: str
    description: str | None = None
    is_public: bool
    create_time: datetime
    update_time: datetime | None = None
    is_forked: bool | None = None
    creator: UserPublicInfo
    engine_provided: EngineProvidedInfo
    
    @field_serializer("create_time")
    def serializer_create_timezone(self, v: datetime):
        if v.tzinfo is None:
            return v.replace(tzinfo=timezone.utc)  # 默认转换为 UTC
        return v
    @field_serializer("update_time")
    def serializer_update_timezone(self, v: datetime | None):
        if v is None:
            return None
        if v.tzinfo is None:
            return v.replace(tzinfo=timezone.utc)  # 默认转换为 UTC
        return v

    class Config:
        from_attributes = True

class EngineInfo(BaseModel):
    id: int
    uuid: str
    category: int
    name: str
    description: str | None = None
    is_public: bool
    create_time: datetime
    update_time: datetime | None = None
    is_forked: bool | None = None
    creator: UserPublicInfo
    engine_provided: EngineProvidedInfo
    
    @field_serializer("create_time")
    def serializer_create_timezone(self, v: datetime):
        if v.tzinfo is None:
            return v.replace(tzinfo=timezone.utc)  # 默认转换为 UTC
        return v
    @field_serializer("update_time")
    def serializer_update_timezone(self, v: datetime | None):
        if v is None:
            return None
        if v.tzinfo is None:
            return v.replace(tzinfo=timezone.utc)  # 默认转换为 UTC
        return v

    class Config:
        from_attributes = True

class UsableEnginesResponse(BaseModel):
    data: list[EngineInfo]
    class Config:
        from_attributes = True

class UsableEngineSearchRequest(BaseModel):
    keyword: str | None = None
    filter_category: int | None = None

class CommunityEngineSearchRequest(BaseModel):
    keyword: str | None = None
    start: int | None = None
    limit: int = 10
    filter_category: int | None = None

class EngineDeleteRequest(BaseModel):
    engine_id: int

class EngineForkRequest(BaseModel):
    engine_id: int
    status: bool

class EngineUpdateRequest(BaseModel):
    engine_id: int
    config_json: str| None = None
    name: str | None = None
    description: str | None = None
    is_public: bool | None = None