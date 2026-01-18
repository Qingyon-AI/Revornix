from pydantic import BaseModel
from .user import UserPublicInfo
from datetime import datetime, timezone
from pydantic import field_serializer

class ModelProviderForkRequest(BaseModel):
    provider_id: int
    status: bool

class ModelCreateRequest(BaseModel):
    name: str
    description: str | None
    provider_id: int

class ModelCreateResponse(BaseModel):
    id: int
    
class ModelProviderDetail(BaseModel):
    id: int
    uuid: str
    name: str
    is_public: bool
    description: str | None
    api_key: str | None = None
    base_url: str | None = None
    create_time: datetime
    update_time: datetime | None
    creator: UserPublicInfo
    
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

class ModelProvider(BaseModel):
    id: int
    uuid: str
    name: str
    is_forked: bool | None = None
    is_public: bool
    description: str | None
    create_time: datetime
    update_time: datetime | None
    creator: UserPublicInfo
    
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

class Model(BaseModel):
    id: int
    uuid: str
    name: str
    description: str | None
    create_time: datetime
    update_time: datetime | None
    
    provider: ModelProvider
    
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

class ModelProviderCreateRequest(BaseModel):
    name: str
    description: str | None = None
    api_key: str | None = None
    base_url: str
    is_public: bool

class ModelProviderCreateResponse(BaseModel):
    id: int

class ModelRequest(BaseModel):
    model_id: int

class ModelProviderRequest(BaseModel):
    provider_id: int

class DeleteModelRequest(BaseModel):
    model_ids: list[int]

class DeleteModelProviderRequest(BaseModel):
    provider_id: int

class ModelSearchRequest(BaseModel):
    keyword: str | None = None
    provider_id: int | None = None

class ModelSearchResponse(BaseModel):
    data: list[Model] | None = None
    class Config:
        from_attributes = True

class ModelProviderSearchRequest(BaseModel):
    keyword: str | None = None
    start: int | None = None
    limit: int = 10

class ModelUpdateRequest(BaseModel):
    id: int
    name: str | None = None
    description: str | None = None
    
class ModelProviderUpdateRequest(BaseModel):
    id: int
    name: str | None = None
    description: str | None = None
    api_key: str | None = None
    base_url: str | None = None
    is_public: bool | None = None

class ChatItem(BaseModel):
    chat_id: str
    content: str
    role: str

class ChatMessages(BaseModel):
    messages: list[ChatItem]
    enable_mcp: bool = False