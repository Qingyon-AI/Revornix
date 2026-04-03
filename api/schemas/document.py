from datetime import date as date_type
from datetime import datetime

from pydantic import field_serializer, ConfigDict, model_validator

from .base import BaseModel
from .ai import ChatItem
from .task import (
    DocumentConvertTask,
    DocumentEmbeddingTask,
    DocumentGraphTask,
    DocumentPodcastTask,
    DocumentProcessTask,
    DocumentSummarizeTask,
    DocumentTranscribeTask
)
from .user import UserPublicInfo


class DocumentGraphGenerateRequest(BaseModel):
    document_id: int

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

class DocumentTranscribeRequest(BaseModel):
    document_id: int

class DocumentMarkdownConvertRequest(BaseModel):
    document_id: int

class DocumentAiSummaryRequest(BaseModel):
    document_id: int


class DocumentAskRequest(BaseModel):
    document_id: int
    messages: list["ChatItem"]
    enable_mcp: bool = False

class BaseSectionInfo(BaseModel):
    id: int
    title: str
    description: str | None
    publish_uuid: str | None = None
    model_config = ConfigDict(
        from_attributes=True,
        extra="ignore",
    )

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

    model_config = ConfigDict(
        from_attributes=True,
        extra="ignore",
    )

class SummaryItem(BaseModel):
    date: date_type
    total: int
    @field_serializer("date")
    def format_date(self, v: date_type) -> str:
        return v.strftime("%Y-%m-%d")

class DocumentMonthSummaryResponse(BaseModel):
    data: list[SummaryItem]

class BaseDocumentCreateRequest(BaseModel):
    category: int
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
    auto_transcribe: bool = False
    auto_tag: bool = False

class DocumentCreateRequest(BaseDocumentCreateRequest):
    from_plat: str

class ApiDocumentCreateRequest(BaseDocumentCreateRequest):
    pass

class DocumentCreateResponse(BaseModel):
    document_id: int

class DocumentLabel(BaseModel):
    id: int
    name: str
    model_config = ConfigDict(
        from_attributes=True,
        extra="ignore",
    )

class CreateLabelResponse(BaseModel):
    id: int
    name: str

class LabelListResponse(BaseModel):
    data: list[DocumentLabel]

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
    labels: list[DocumentLabel] = []
    sections: list[BaseSectionInfo] = []
    users: list[UserPublicInfo] = []
    convert_task: DocumentConvertTask | None = None
    embedding_task: DocumentEmbeddingTask | None = None
    graph_task: DocumentGraphTask | None = None
    podcast_task: DocumentPodcastTask | None = None
    summarize_task: DocumentSummarizeTask | None = None
    transcribe_task: DocumentTranscribeTask | None = None
    process_task: DocumentProcessTask | None = None

    model_config = ConfigDict(
        from_attributes=True,
        extra="ignore",
    )

class WebsiteDocumentInfo(BaseModel):
    url: str
    latest_snapshot_time: datetime | None = None
    snapshot_count: int = 0


class WebsiteDocumentSnapshotInfo(BaseModel):
    id: int
    url: str
    title: str | None = None
    description: str | None = None
    cover: str | None = None
    md_file_name: str | None = None
    create_time: datetime

    model_config = ConfigDict(
        from_attributes=True,
        extra="ignore",
    )

class FileDocumentInfo(BaseModel):
    file_name: str

class QuickNoteDocumentInfo(BaseModel):
    content: str

class AudioDocumentInfo(BaseModel):
    audio_file_name: str

class DocumentDetailResponse(BaseModel):
    id: int
    category: int
    title: str
    from_plat: str
    description: str | None = None
    cover: str | None = None
    create_time: datetime
    update_time: datetime | None
    labels: list[DocumentLabel] = []
    creator: UserPublicInfo
    sections: list[BaseSectionInfo] = []
    users: list[UserPublicInfo] = []
    is_star: bool | None = None
    is_read: bool | None = None
    website_info: WebsiteDocumentInfo | None = None
    website_snapshots: list[WebsiteDocumentSnapshotInfo] = []
    file_info: FileDocumentInfo | None = None
    quick_note_info: QuickNoteDocumentInfo | None = None
    audio_info: AudioDocumentInfo | None = None
    convert_task: DocumentConvertTask | None = None
    embedding_task: DocumentEmbeddingTask | None = None
    graph_task: DocumentGraphTask | None = None
    podcast_task: DocumentPodcastTask | None = None
    summarize_task: DocumentSummarizeTask | None = None
    transcribe_task: DocumentTranscribeTask | None = None
    process_task: DocumentProcessTask | None = None

    model_config = ConfigDict(
        from_attributes=True,
        extra="ignore",
    )

class DocumentDeleteRequest(BaseModel):
    document_ids: list[int]


class DocumentDetailRequest(BaseModel):
    document_id: int | None = None
    url: str | None = None

    @model_validator(mode="after")
    def validate_document_identifier(self):
        if self.document_id is None and (self.url is None or len(self.url.strip()) == 0):
            raise ValueError("Either document_id or url is required")
        return self

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
    label_info: DocumentLabel
    count: int

class LabelSummaryResponse(BaseModel):
    data: list[LabelSummaryItem]
