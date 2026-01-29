from datetime import datetime, timezone

from pydantic import BaseModel, Field, field_serializer, field_validator

from enums.section import UserSectionRole
from protocol.remote_file_service import RemoteFileServiceProtocol
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
    role: int
    authority: int

class GenerateSectionPodcastRequest(BaseModel):
    section_id: int

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
    create_time: datetime
    update_time: datetime | None
    @field_serializer("create_time")
    def serializer_create_time(self, v: datetime):
        if v.tzinfo is None:
            return v.replace(tzinfo=timezone.utc)  # 默认转换为 UTC
        return v
    @field_serializer("update_time")
    def serializer_update_time(self, v: datetime | None):
        if v is None:
            return None
        if v.tzinfo is None:
            return v.replace(tzinfo=timezone.utc)  # 默认转换为 UTC
        return v
    class Config:
        from_attributes = True

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
    filter_roles: list[int] | None = None

class SectionUserResponse(BaseModel):
    users: list[SectionUserPublicInfo]

class SectionUserDeleteRequest(BaseModel):
    section_id: int
    user_id: int

class SectionUserAddRequest(BaseModel):
    section_id: int
    user_id: int
    authority: int

class SectionUserModifyRequest(BaseModel):
    section_id: int
    user_id: int
    authority: int
    role: int
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

class BaseSectionInfo(BaseModel):
    id: int
    title: str
    description: str | None
    authority: int | None = None
    class Config:
        from_attributes = True

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

class SectionDocumentInfo(BaseModel):
    id: int
    title: str
    status: int
    category: int
    cover: str | None = None
    description: str | None = None
    from_plat: str | None = None
    labels: list[Label] | None = None
    sections: list[BaseSectionInfo] | None = None
    users: list[UserPublicInfo] | None = None
    create_time: datetime
    update_time: datetime | None = None
    @field_serializer("create_time")
    def serializer_create_time(self, v: datetime):
        if v.tzinfo is None:
            return v.replace(tzinfo=timezone.utc)  # 默认转换为 UTC
        return v
    @field_serializer("update_time")
    def serializer_update_time(self, v: datetime | None):
        if v is None:
            return None
        if v.tzinfo is None:
            return v.replace(tzinfo=timezone.utc)  # 默认转换为 UTC
        return v
    class Config:
        from_attributes = True

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
    authority: int | None = None
    is_subscribed: bool | None = None
    md_file_name: str | None = None
    labels: list[Label] | None = None
    cover: str | None
    podcast_task: SectionPodcastTask | None = None
    process_task: SectionProcessTask | None = None
    process_task_trigger_type: int | None = None
    process_task_trigger_scheduler: str | None = None

    @field_serializer("create_time")
    def serialize_create_time(self, v: datetime):
        return v if v.tzinfo else v.replace(
            tzinfo=timezone.utc
        )

    @field_serializer("update_time")
    def serialize_update_time(self, v: datetime | None):
        if v is None:
            return None
        return v if v.tzinfo else v.replace(
            tzinfo=timezone.utc
        )

    class Config:
        from_attributes = True

class SectionDeleteRequest(BaseModel):
    section_id: int

class DaySectionRequest(BaseModel):
    date: str

class DaySectionResponse(BaseModel):
    section_id: int
    creator: UserPublicInfo
    date: str
    title: str
    description: str | None
    create_time: datetime
    update_time: datetime | None
    md_file_name: str | None
    documents: list[SectionDocumentInfo]

    @field_serializer("create_time")
    def serialize_create_time(self, v):
        return v if v.tzinfo else v.replace(tzinfo=timezone.utc)

    @field_serializer("update_time")
    def serialize_update_time(self, v: datetime | None):
        if v is None:
            return None
        return v if v.tzinfo else v.replace(tzinfo=timezone.utc)

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
    documents: list[int] | None = None
    labels: list[int] | None = None
    auto_podcast: bool | None = None
    auto_illustration: bool | None = None
    process_task_trigger_type: int | None = None
    process_task_trigger_scheduler: str | None = None
