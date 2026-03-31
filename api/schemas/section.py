from datetime import datetime

from pydantic import Field, field_validator

from .base import BaseModel
from .ai import ChatItem
from enums.section import SectionProcessTriggerType, UserSectionRole, UserSectionAuthority
from schemas.task import SectionPodcastTask, SectionProcessTask
from schemas.user import SectionUserPublicInfo, UserPublicInfo


class ImagePlan(BaseModel):
    id: str = Field(..., description="Unique id used in markdown marker [image-id: <id>]")
    prompt: str = Field(..., description="Prompt for image generation engine")

class ImagePlanResult(BaseModel):
    markdown_with_markers: str
    plans: list[ImagePlan]

class GeneratedImage(BaseModel):
    id: str
    prompt: str
    image: str  # markdown image string, e.g. ![](data:image/png;base64,...)

class MineSectionRoleAndAuthorityRequest(BaseModel):
    section_id: int

class SectionUserRoleAndAuthorityRequest(BaseModel):
    section_id: int
    user_id: int

class SectionUserRoleAndAuthorityResponse(BaseModel):
    section_id: int
    user_id: int
    role: UserSectionRole
    authority: UserSectionAuthority

class GenerateSectionPodcastRequest(BaseModel):
    section_id: int

class RetrySectionDocumentRequest(BaseModel):
    section_id: int
    document_id: int

class SectionDocumentRequest(BaseModel):
    section_id: int
    start: int | None = None
    limit: int = 10
    desc: bool = True
    keyword: str | None = None

class SectionSeoDetailRequest(BaseModel):
    uuid: str

class SectionPublishGetRequest(BaseModel):
    section_id: int

class SectionPublishGetResponse(BaseModel):
    status: bool
    uuid: str | None = None
    create_time: datetime | None = None
    update_time: datetime | None = None

class SectionRePublishRequest(BaseModel):
    section_id: int

class SectionPublishRequest(BaseModel):
    section_id: int
    status: bool

class SectionUserRequest(BaseModel):
    section_id: int
    start: int | None = None
    limit: int = 10
    keyword: str | None = None
    filter_roles: list[UserSectionRole] | None = None

class SectionUserResponse(BaseModel):
    users: list[SectionUserPublicInfo]

class SectionUserDeleteRequest(BaseModel):
    section_id: int
    user_id: int

class SectionUserAddRequest(BaseModel):
    section_id: int
    user_id: int
    authority: UserSectionAuthority

class SectionUserModifyRequest(BaseModel):
    section_id: int
    user_id: int
    authority: UserSectionAuthority
    role: UserSectionRole
    @field_validator("role")
    def check_role_not_invalid(cls, v: int):
        if v == UserSectionRole.CREATOR:
            raise ValueError("You can't change the user's role to CREATOR because there is only one creator in a section")
        return v

class LabelDeleteRequest(BaseModel):
    label_ids: list[int]

class SearchSubscribedSectionRequest(BaseModel):
    start: int | None = None
    limit: int = 10
    desc: bool = True
    keyword: str | None = None
    label_ids: list[int] | None = None

class SectionCommentInfo(BaseModel):
    id: int
    content: str
    create_time: datetime
    update_time: datetime | None
    creator: UserPublicInfo

class SectionCommentSearchRequest(BaseModel):
    section_id: int
    start: int | None = None
    limit: int = 10
    keyword: str | None = None

class SectionCommentDeleteRequest(BaseModel):
    section_comment_ids: list[int]

class SectionCommentCreateRequest(BaseModel):
    content: str
    section_id: int

class SectionSubscribeRequest(BaseModel):
    section_id: int
    status: bool

class SearchUserSectionsRequest(BaseModel):
    user_id: int
    keyword: str | None = None
    start: int | None = None
    limit: int = 10
    label_ids: list[int] | None = None
    desc: bool = True

class SectionDetailRequest(BaseModel):
    section_id: int


class SectionAskRequest(BaseModel):
    section_id: int
    messages: list[ChatItem]
    enable_mcp: bool = False


class SectionAskChunkCitation(BaseModel):
    document_id: int
    document_title: str
    chunk_id: str
    excerpt: str
    score: float | None = None

class BaseSectionInfo(BaseModel):
    id: int
    title: str
    description: str | None
    authority: UserSectionAuthority | None = None
    publish_uuid: str | None = None

class AllMySectionsResponse(BaseModel):
    data: list[BaseSectionInfo]

class SearchMineSectionsRequest(BaseModel):
    keyword: str | None = None
    start: int | None = None
    limit: int = 10
    label_ids: list[int] | None = None
    desc: bool = True

class SearchPublicSectionsRequest(BaseModel):
    keyword: str | None = None
    start: int | None = None
    limit: int = 10
    desc: bool = True
    label_ids: list[int] | None = None

class SectionLabel(BaseModel):
    id: int
    name: str

class CreateLabelResponse(BaseModel):
    id: int
    name: str

class LabelListResponse(BaseModel):
    data: list[SectionLabel]

class LabelAddRequest(BaseModel):
    name: str

class SectionDocumentInfo(BaseModel):
    id: int
    title: str
    status: int
    category: int
    cover: str | None = None
    description: str | None = None
    from_plat: str | None = None
    labels: list[SectionLabel] | None = None
    users: list[UserPublicInfo] | None = None
    create_time: datetime
    update_time: datetime | None = None

class SectionDocumentIntegrationSummary(BaseModel):
    wait_to_count: int = 0
    supplementing_count: int = 0
    success_count: int = 0
    failed_count: int = 0

class SectionInfo(BaseModel):
    id: int
    title: str
    creator: UserPublicInfo
    description: str
    auto_podcast: bool
    auto_illustration: bool
    documents_count: int = 0
    subscribers_count: int = 0
    create_time: datetime
    update_time: datetime | None = None
    authority: UserSectionAuthority | None = None
    is_subscribed: bool | None = None
    md_file_name: str | None = None
    labels: list[SectionLabel] | None = None
    cover: str | None
    publish_uuid: str | None = None
    podcast_task: SectionPodcastTask | None = None
    process_task: SectionProcessTask | None = None
    document_integration: SectionDocumentIntegrationSummary | None = None
    graph_stale: bool | None = None
    process_task_trigger_type: int | None = None
    process_task_trigger_scheduler: str | None = None

class SectionDeleteRequest(BaseModel):
    section_id: int

class DaySectionRequest(BaseModel):
    date: str

class DaySectionResponse(BaseModel):
    section_id: int | None = None
    creator: UserPublicInfo | None = None
    date: str
    title: str | None = None
    description: str | None
    auto_podcast: bool = True
    auto_illustration: bool = True
    create_time: datetime | None = None
    update_time: datetime | None
    md_file_name: str | None
    documents: list[SectionDocumentInfo] = Field(default_factory=list)
    podcast_task: SectionPodcastTask | None = None
    process_task: SectionProcessTask | None = None
    process_task_trigger_type: int | None = SectionProcessTriggerType.SCHEDULER
    process_task_trigger_scheduler: str | None = None
    is_created: bool = True

class SectionCreateRequest(BaseModel):
    title: str
    description: str
    cover: str | None = None
    labels: list[int]
    auto_publish: bool = False
    auto_podcast: bool = False
    auto_illustration: bool = False
    process_task_trigger_type: int
    process_task_trigger_scheduler: str | None = None

class SectionCreateResponse(BaseModel):
    id: int

class SectionUpdateRequest(BaseModel):
    section_id: int
    title: str | None = None
    description: str | None = None
    cover: str | None = None
    labels: list[int] | None = None
    auto_podcast: bool | None = None
    auto_illustration: bool | None = None
    process_task_trigger_type: int | None = None
    process_task_trigger_scheduler: str | None = None
