from pydantic import BaseModel
    
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