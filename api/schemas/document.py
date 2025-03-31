from pydantic import BaseModel, field_validator
from datetime import datetime, timezone
from .user import UserPublicInfo
from .task import DocumentTransformTask

class DocumentMarkdownTransformRequest(BaseModel):
    document_id: int

class DocumentAiSummaryRequest(BaseModel):
    document_id: int

class BaseSectionInfo(BaseModel):
    id: int
    title: str
    description: str
    class Config:
        from_attributes = True 

class SearchDocumentNoteRequest(BaseModel):
    document_id: int
    keyword: str | None = None
    start: int | None = None
    limit: int = 10

class DocumentNoteCreateRequest(BaseModel):
    document_id: int
    content: str
    
class DocumentNoteDeleteRequest(BaseModel):
    document_note_ids: list[int]
    
class DocumentNoteUpdateRequest(BaseModel):
    document_note_id: int
    content: str
    
class DocumentNoteInfo(BaseModel):
    id: int
    content: str
    user: UserPublicInfo
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

class SummaryItem(BaseModel):
    date: str
    total: int
    @field_validator("date", mode="before")
    def format_date(cls, v: datetime) -> str:
        return v.strftime("%Y-%m-%d")
    
class DocumentMonthSummaryResponse(BaseModel):
    data: list[SummaryItem]

class DocumentCreateRequest(BaseModel):
    category: int
    from_plat: str
    sections: list[int]
    auto_summary: bool = False
    labels: list[int] | None = None
    title: str | None = None
    description: str | None = None
    cover: int | None = None
    url: str | None = None
    content: str | None = None
    file_name: str | None = None
    
class DocumentCreateResponse(BaseModel):
    document_id: int
        
class Label(BaseModel):
    id: int
    name: str
    class Config:
        from_attributes = True
    
class CreateLabelResponse(BaseModel):
    id: int
    name: str
    
class LabelListResponse(BaseModel):
    data: list[Label]
    
class LabelAddRequest(BaseModel):
    name: str
    
class SearchUnreadListRequest(BaseModel):
    keyword: str | None = None
    start: int | None = None
    limit: int = 10
    label_ids: list[int] | None = None
    desc: bool | None = True

class SearchRecentReadRequest(BaseModel):
    keyword: str | None = None
    start: int | None = None
    limit: int = 10
    label_ids: list[int] | None = None
    desc: bool | None = True
    
class SearchAllMyDocumentsRequest(BaseModel):
    keyword: str | None = None
    start: int | None = None
    limit: int = 10
    label_ids: list[int] | None = None
    desc: bool | None = True
    
class SearchMyStarDocumentsRequest(BaseModel):
    keyword: str | None = None
    start: int | None = None
    limit: int = 10
    label_ids: list[int] | None = None
    desc: bool | None = True

class DocumentInfo(BaseModel):
    id: int
    category: int | None = None
    title: str | None = None
    cover: str | None = None
    description: str | None = None
    from_plat: str | None = None
    create_time: datetime | None = None
    update_time: datetime | None = None
    labels: list[Label] | None = None
    sections: list[BaseSectionInfo] | None = None
    users: list[UserPublicInfo] | None = None
    transform_task: DocumentTransformTask | None = None
    
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
    
class WebsiteDocumentInfo(BaseModel):
    url: str
    md_file_name: str | None = None
    
class FileDocumentInfo(BaseModel):
    file_name: str
    md_file_name: str | None = None
    
class QuickNoteDocumentInfo(BaseModel):
    content: str
    
class DocumentDetailResponse(BaseModel):
    id: int
    title: str | None = None
    ai_summary: str | None = None
    description: str | None = None
    cover: str | None = None
    category: int | None = None
    create_time: datetime | None = None
    update_time: datetime | None = None
    labels: list[Label] | None = None
    creator: UserPublicInfo | None = None
    sections: list[BaseSectionInfo] | None = None
    from_plat: str | None = None
    users: list[UserPublicInfo] | None = None
    is_star: bool | None = None
    is_read: bool | None = None
    website_info: WebsiteDocumentInfo | None = None
    file_info: FileDocumentInfo | None = None
    quick_note_info: QuickNoteDocumentInfo | None = None
    transform_task: DocumentTransformTask | None = None
    
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
    
class DocumentDeleteRequest(BaseModel):
    document_ids: list[int]
    

class DocumentDetailRequest(BaseModel):
    document_id: int
    
class ReadRequest(BaseModel):
    document_id: int
    status: bool

class StarRequest(BaseModel):
    document_id: int
    status: bool
    
class VectorSearchRequest(BaseModel):
    query: str
    
class VectorSearchResponse(BaseModel):
    documents: list[DocumentInfo]