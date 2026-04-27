from __future__ import annotations

from datetime import date as date_type
from datetime import datetime

from pydantic import Field, field_serializer, ConfigDict, model_validator

from .base import BaseModel
from .ai import ChatItem
from enums.document import UserDocumentAuthority
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

PUBLIC_PAGINATION_LIMIT = 20


class DocumentGraphGenerateRequest(BaseModel):
    document_id: int
    model_id: int | None = None

class GenerateDocumentPodcastRequest(BaseModel):
    document_id: int
    engine_id: int | None = None

class DocumentPublishRequest(BaseModel):
    document_id: int
    status: bool

class DocumentPublishGetRequest(BaseModel):
    document_id: int

class DocumentPublishGetResponse(BaseModel):
    status: bool
    create_time: datetime | None = None
    update_time: datetime | None = None

class MineDocumentAuthorityRequest(BaseModel):
    document_id: int

class DocumentUserAuthorityResponse(BaseModel):
    document_id: int
    user_id: int
    authority: UserDocumentAuthority
    is_creator: bool = False

class DocumentUserRequest(BaseModel):
    document_id: int
    start: int | None = None
    limit: int = Field(default=10, le=PUBLIC_PAGINATION_LIMIT)
    keyword: str | None = None

class DocumentUserDeleteRequest(BaseModel):
    document_id: int
    user_id: int

class DocumentUserAddRequest(BaseModel):
    document_id: int
    user_id: int
    authority: UserDocumentAuthority

class DocumentUserModifyRequest(BaseModel):
    document_id: int
    user_id: int
    authority: UserDocumentAuthority

class DocumentCollaboratorPublicInfo(BaseModel):
    id: int
    avatar: str
    nickname: str
    slogan: str | None = None
    authority: UserDocumentAuthority | None = None
    create_time: datetime
    update_time: datetime | None

    model_config = ConfigDict(
        from_attributes=True,
        extra="ignore",
    )

class DocumentUpdateRequest(BaseModel):
    document_id: int
    title: str | None = None
    description: str | None = None
    cover: str | None = None
    labels: list[int] | None = None
    sections: list[int] | None = None
    content: str | None = None

class LabelDeleteRequest(BaseModel):
    label_ids: list[int]

class DocumentEmbeddingRequest(BaseModel):
    document_id: int

class DocumentTranscribeRequest(BaseModel):
    document_id: int
    engine_id: int | None = None

class DocumentMarkdownConvertRequest(BaseModel):
    document_id: int

class DocumentAiSummaryRequest(BaseModel):
    document_id: int
    model_id: int | None = None


class CancelDocumentTaskRequest(BaseModel):
    document_id: int


class DocumentAskRequest(BaseModel):
    document_id: int
    messages: list["ChatItem"]
    enable_mcp: bool = False
    model_id: int | None = None

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

class SearchPublicDocumentsRequest(BaseModel):
    keyword: str | None = None
    creator_id: int | None = None
    start: int | None = None
    limit: int = 10
    label_ids: list[int] | None = None
    desc: bool = True

class DocumentInfo(BaseModel):
    id: int
    creator_id: int
    creator: UserPublicInfo | None = None
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


class DocumentMarkdownContentRequest(BaseModel):
    document_id: int | None = None
    url: str | None = None
    snapshot_id: int | None = None

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


class DocumentCommentInfo(BaseModel):
    id: int
    content: str
    create_time: datetime
    update_time: datetime | None
    creator: UserPublicInfo
    parent_id: int | None = None
    root_id: int | None = None
    reply_user: UserPublicInfo | None = None
    like_count: int = 0
    liked: bool = False
    reply_count: int = 0
    preview_replies: list[DocumentCommentInfo] = Field(default_factory=list)


class DocumentCommentSearchRequest(BaseModel):
    document_id: int
    start: int | None = None
    limit: int = Field(default=10, le=PUBLIC_PAGINATION_LIMIT)
    keyword: str | None = None
    sort: str = Field(default="time", description="time | hot")
    preview_reply_limit: int = Field(default=2, ge=0, le=5)


class DocumentCommentReplySearchRequest(BaseModel):
    root_comment_id: int
    start: int | None = None
    limit: int = Field(default=10, le=PUBLIC_PAGINATION_LIMIT)


class DocumentCommentLikeRequest(BaseModel):
    document_comment_id: int


class DocumentCommentDeleteRequest(BaseModel):
    document_comment_ids: list[int]


class DocumentCommentDetailRequest(BaseModel):
    document_comment_id: int


class DocumentCommentCreateRequest(BaseModel):
    content: str
    document_id: int
    parent_id: int | None = None
