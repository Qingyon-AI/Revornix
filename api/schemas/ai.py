from pydantic import BaseModel
from typing import Any

class ModelCreateRequest(BaseModel):
    name: str
    description: str | None
    provider_id: int
    
class ModelCreateResponse(BaseModel):
    id: int
    
class ModelProvider(BaseModel):
    id: int
    name: str
    description: str | None
    api_key: str | None
    api_url: str | None
    class Config:
        from_attributes = True
        
class Model(BaseModel):
    id: int
    name: str
    description: str | None
    provider: ModelProvider
    class Config:
        from_attributes = True

class ModelProviderCreateRequest(BaseModel):
    name: str
    description: str | None = None
    api_key: str
    api_url: str
    
class ModelProviderCreateResponse(BaseModel):
    id: int
    
class ModelRequest(BaseModel):
    model_id: int
    
class ModelProviderRequest(BaseModel):
    provider_id: int
    
class DeleteModelRequest(BaseModel):
    model_ids: list[int]
    
class DeleteModelProviderRequest(BaseModel):
    provider_ids: list[int]
    
class ModelSearchRequest(BaseModel):
    keyword: str | None = None
    provider_id: int | None = None
    
class ModelSearchResponse(BaseModel):
    data: list[Model] | None = None
    class Config:
        from_attributes = True
        
class ModelProviderSearchRequest(BaseModel):
    keyword: str | None = None
    provider_id: int | None = None
        
class ModelProviderSearchResponse(BaseModel):
    data: list[ModelProvider] | None = None
    class Config:
        from_attributes = True
        
class ModelUpdateRequest(BaseModel):
    id: int
    name: str | None = None
    description: str | None = None
    
class ModelProviderUpdateRequest(BaseModel):
    id: int
    name: str | None = None
    description: str | None = None
    api_key: str | None = None
    api_url: str | None = None
    
class Document(BaseModel):
    id: int
    title: str
    description: str | None
    ai_summary: str | None
    
class CoverImage(BaseModel):
    url: str
    width: int
    height: int
    
class ReferenceItem(BaseModel):
    url: str
    logo_url: str | None = None
    site_name: str
    title: str
    summary: str | None = None
    publish_time: str
    cover_image: CoverImage | None = None
    
class ChatItem(BaseModel):
    chat_id: str
    quote: list[Document] | None = None
    content: str | None = None
    reasoning_content: str | None = None
    role: str
    finish_reason: str | None = None
    references: list[ReferenceItem] | None = None
    
class ChatMessages(BaseModel):
    messages: list[ChatItem]
    enable_mcp: bool = False
    
class ResponseItem(BaseModel):
    status: str
    content: Any | None = None