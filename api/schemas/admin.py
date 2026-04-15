from datetime import datetime

from pydantic import field_validator

from .base import BaseModel
from .document import DocumentDetailResponse
from .notification import (
    AddNotificationTaskRequest,
    DeleteNotificationTaskRequest,
    NotificationTaskDetailRequest,
    UpdateNotificationTaskRequest,
)
from .section import SectionInfo, SectionPptPreview
from enums.user import UserRole


class AdminUserSearchRequest(BaseModel):
    keyword: str | None = None
    role: int | None = None
    is_forbidden: bool | None = None
    page_num: int = 1
    page_size: int = 10

    @field_validator("role")
    def validate_role(cls, v: int | None):
        if v is None:
            return v
        if v not in [UserRole.ROOT, UserRole.ADMIN, UserRole.USER]:
            raise ValueError("Invalid user role")
        return v


class AdminUserSummary(BaseModel):
    id: int
    uuid: str
    cover: str | None = None
    role: int
    avatar: str
    nickname: str
    slogan: str | None = None
    email: str | None = None
    phone: str | None = None
    is_forbidden: bool
    fans: int = 0
    follows: int = 0
    create_time: datetime
    update_time: datetime | None = None


class AdminUserDetail(AdminUserSummary):
    default_user_file_system: int | None = None
    default_read_mark_reason: int | None = None
    default_document_reader_model_id: int | None = None
    default_revornix_model_id: int | None = None
    default_file_document_parse_user_engine_id: int | None = None
    default_website_document_parse_user_engine_id: int | None = None
    default_podcast_user_engine_id: int | None = None
    default_audio_transcribe_engine_id: int | None = None
    default_image_generate_engine_id: int | None = None
    default_ai_interaction_language: int | None = None


class AdminUserDetailRequest(BaseModel):
    user_id: int


class AdminUserCreateRequest(BaseModel):
    nickname: str
    email: str
    password: str
    role: int = UserRole.USER
    slogan: str | None = None
    avatar: str | None = None

    @field_validator("role")
    def validate_role(cls, v: int):
        if v not in [UserRole.ROOT, UserRole.ADMIN, UserRole.USER]:
            raise ValueError("Invalid user role")
        return v


class AdminUserUpdateRequest(BaseModel):
    user_id: int
    nickname: str | None = None
    email: str | None = None
    password: str | None = None
    role: int | None = None
    slogan: str | None = None
    avatar: str | None = None
    is_forbidden: bool | None = None

    @field_validator("role")
    def validate_role(cls, v: int | None):
        if v is None:
            return v
        if v not in [UserRole.ROOT, UserRole.ADMIN, UserRole.USER]:
            raise ValueError("Invalid user role")
        return v


class AdminUserDeleteRequest(BaseModel):
    user_id: int


class AdminUserComputeInfoRequest(BaseModel):
    user_id: int


class AdminUserComputeInfoResponse(BaseModel):
    available_points: int = 0


class AdminUserComputeLedgerRequest(BaseModel):
    user_id: int
    page: int = 0
    page_size: int = 20
    direction: str = "all"


class AdminUserComputeLedgerItem(BaseModel):
    id: int
    delta_points: int
    balance_after: int
    reason: str | None = None
    source: str | None = None
    create_time: datetime | None = None
    expire_time: datetime | None = None


class AdminUserComputeLedgerResponse(BaseModel):
    items: list[AdminUserComputeLedgerItem] = []
    total: int = 0
    page: int = 0
    page_size: int = 20
    has_more: bool = False


class AdminUserNotificationSourceSearchRequest(BaseModel):
    user_id: int
    keyword: str | None = None
    start: int | None = None
    limit: int = 10


class AdminUserNotificationTargetSearchRequest(BaseModel):
    user_id: int
    keyword: str | None = None
    start: int | None = None
    limit: int = 10


class AdminUserNotificationTaskPageRequest(BaseModel):
    user_id: int
    page_num: int = 1
    page_size: int = 10


class AdminNotificationTaskDetailRequest(NotificationTaskDetailRequest):
    user_id: int


class AdminDeleteNotificationTaskRequest(DeleteNotificationTaskRequest):
    user_id: int


class AdminAddNotificationTaskRequest(AddNotificationTaskRequest):
    user_id: int


class AdminUpdateNotificationTaskRequest(UpdateNotificationTaskRequest):
    user_id: int


class AdminDocumentSearchRequest(BaseModel):
    keyword: str | None = None
    page_num: int = 1
    page_size: int = 10


class AdminDocumentSummary(BaseModel):
    id: int
    title: str
    description: str | None = None
    category: int
    from_plat: str
    creator_id: int
    creator_nickname: str
    create_time: datetime
    update_time: datetime | None = None


class AdminDocumentDetailRequest(BaseModel):
    document_id: int


class AdminDocumentDeleteRequest(BaseModel):
    document_ids: list[int]


class AdminSectionSearchRequest(BaseModel):
    keyword: str | None = None
    page_num: int = 1
    page_size: int = 10


class AdminSectionSummary(BaseModel):
    id: int
    title: str
    description: str | None = None
    creator_id: int
    creator_nickname: str
    documents_count: int = 0
    subscribers_count: int = 0
    publish_uuid: str | None = None
    create_time: datetime
    update_time: datetime | None = None


class AdminSectionDetailRequest(BaseModel):
    section_id: int


class AdminSectionDeleteRequest(BaseModel):
    section_ids: list[int]


class AdminDocumentDetailResponse(DocumentDetailResponse):
    pass


class AdminSectionDetailResponse(SectionInfo):
    pass


class AdminAntiScrapeStatsRequest(BaseModel):
    pass


class AdminAntiScrapeSummaryWindow(BaseModel):
    minutes: int
    counts: dict[str, int]


class AdminAntiScrapeEvent(BaseModel):
    timestamp: datetime
    event: str
    policy: str
    rule: str
    method: str
    host: str
    path: str
    service: str
    clientIp: str
    userAgentHash: str
    limit: int | None = None
    remaining: int | None = None
    resetSeconds: int | None = None


class AdminAntiScrapeStatsResponse(BaseModel):
    timestamp: datetime
    summary: list[AdminAntiScrapeSummaryWindow]
    recentEvents: list[AdminAntiScrapeEvent]


AdminSectionDetailResponse.model_rebuild()
