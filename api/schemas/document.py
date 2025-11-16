from pydantic import BaseModel, field_serializer
from datetime import datetime, timezone, date as date_type
from protocol.remote_file_service import RemoteFileServiceProtocol
from .user import UserPublicInfo
from .task import DocumentConvertTask, DocumentEmbeddingTask, DocumentGraphTask, DocumentProcessTask, DocumentPodcastTask

class GenerateDocumentPodcastRequest(BaseModel):
    document_id: int

class DocumentUpdateRequest(BaseModel):
    document_id: int
    title: str | None = None
    description: str | None = None
    cover: str | None = None
    labels: list[int] | None = None
    sections: list[int] | None = None

class LabelDeleteRequest(BaseModel):
    label_ids: list[int]
    
class DocumentEmbeddingRequest(BaseModel):
    document_id: int
    
class DocumentMarkdownConvertRequest(BaseModel):
    document_id: int

class DocumentAiSummaryRequest(BaseModel):
    document_id: int

class BaseSectionInfo(BaseModel):
    id: int
    title: str
    description: str | None
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
    content: str | None = None
    
class DocumentNoteInfo(BaseModel):
    id: int
    content: str
    user: UserPublicInfo
    create_time: datetime
    update_time: datetime | None

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

class SummaryItem(BaseModel):
    date: date_type
    total: int
    @field_serializer("date")
    def format_date(self, v: date_type) -> str:
        return v.strftime("%Y-%m-%d")
    
class DocumentMonthSummaryResponse(BaseModel):
    data: list[SummaryItem]

class DocumentCreateRequest(BaseModel):
    category: int
    from_plat: str
    sections: list[int] = []
    labels: list[int] = []
    title: str | None = None
    description: str | None = None
    cover: str | None = None
    content: str | None = None
    url: str | None = None
    file_name: str | None = None
    auto_summary: bool = False
    auto_podcast: bool = False
    
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
    desc: bool = True

class SearchRecentReadRequest(BaseModel):
    keyword: str | None = None
    start: int | None = None
    limit: int = 10
    label_ids: list[int] | None = None
    desc: bool = True
    
class SearchAllMyDocumentsRequest(BaseModel):
    keyword: str | None = None
    start: int | None = None
    limit: int = 10
    label_ids: list[int] | None = None
    desc: bool = True
    
class SearchMyStarDocumentsRequest(BaseModel):
    keyword: str | None = None
    start: int | None = None
    limit: int = 10
    label_ids: list[int] | None = None
    desc: bool = True

class DocumentInfo(BaseModel):
    id: int
    creator_id: int
    category: int
    title: str
    from_plat: str
    create_time: datetime
    update_time: datetime | None
    cover: str | None = None
    description: str | None = None
    labels: list[Label] = []
    sections: list[BaseSectionInfo] = []
    users: list[UserPublicInfo] = []
    convert_task: DocumentConvertTask | None = None
    embedding_task: DocumentEmbeddingTask | None = None
    graph_task: DocumentGraphTask | None = None
    podcast_task: DocumentPodcastTask | None = None
    process_task: DocumentProcessTask | None = None
    
    @field_serializer("create_time")
    def serializer_create_timezone(self, v: datetime) -> datetime:
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
    
class WebsiteDocumentInfo(BaseModel):
    creator_id: int
    url: str
    
class FileDocumentInfo(BaseModel):
    creator_id: int
    file_name: str
    @field_serializer("file_name")
    def serializer_file_name(self, v: str) -> str:
        url_prefix = RemoteFileServiceProtocol.get_user_file_system_url_prefix(user_id=self.creator_id)
        return f'{url_prefix}/{v}'
    
class QuickNoteDocumentInfo(BaseModel):
    creator_id: int
    content: str
    
class DocumentDetailResponse(BaseModel):
    id: int
    category: int
    title: str
    from_plat: str
    ai_summary: str | None = None
    description: str | None = None
    cover: str | None = None
    create_time: datetime
    update_time: datetime | None
    labels: list[Label] = []
    creator: UserPublicInfo
    sections: list[BaseSectionInfo] = []
    users: list[UserPublicInfo] = []
    is_star: bool | None = None
    is_read: bool | None = None
    website_info: WebsiteDocumentInfo | None = None
    file_info: FileDocumentInfo | None = None
    quick_note_info: QuickNoteDocumentInfo | None = None
    convert_task: DocumentConvertTask | None = None
    embedding_task: DocumentEmbeddingTask | None = None
    graph_task: DocumentGraphTask | None = None
    podcast_task: DocumentPodcastTask | None = None
    process_task: DocumentProcessTask | None = None
    
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
    
class LabelSummaryItem(BaseModel):
    label_info: Label
    count: int
    
class LabelSummaryResponse(BaseModel):
    data: list[LabelSummaryItem]