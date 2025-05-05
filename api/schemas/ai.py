from pydantic import BaseModel
    
class ModelCreateRequest(BaseModel):
    name: str
    description: str
    provider_id: int
    api_key: str
    api_url: str
    
class ModelProvider(BaseModel):
    id: int
    name: str
    description: str
    api_key: str
    api_url: str
    class Config:
        from_attributes = True
        
class Model(BaseModel):
    id: int
    name: str
    description: str
    api_key: str
    api_url: str
    provider: ModelProvider | None = None
    class Config:
        from_attributes = True

class ModelProviderCreateRequest(BaseModel):
    name: str
    description: str | None = None
    api_key: str
    api_url: str
    
class ModelRequest(BaseModel):
    model_id: int
    
class ModelProviderRequest(BaseModel):
    provider_id: int
    
class DeleteModelRequest(BaseModel):
    model_ids: list[int] | None = None
    
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
    api_key: str | None = None
    api_url: str | None = None
    
class ModelProviderUpdateRequest(BaseModel):
    id: int
    name: str | None = None
    description: str | None = None
    api_key: str | None = None
    api_url: str | None = None
    
class Document(BaseModel):
    id: int
    title: str
    description: str
    ai_summary: str
    
class CoverImage(BaseModel):
    url: str
    width: int
    height: int
    
class Extra(BaseModel):
    rel_info: str
    freshness_info: str
    auth_info: str
    final_ref: str
    
class ReferenceItem(BaseModel):
    url: str
    logo_url: str
    site_name: str
    title: str
    summary: str
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
    search_web: bool
    deep_search: bool
    messages: list[ChatItem]