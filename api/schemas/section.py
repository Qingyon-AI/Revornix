from pydantic import BaseModel, field_validator, field_serializer
from protocol.remote_file_service import RemoteFileServiceProtocol
from datetime import datetime, timezone
from schemas.user import UserPublicInfo, UserPublicBaseInfo
from enums.section import UserSectionRole

class SectionUserRequest(BaseModel):
    section_id: int
    filter_role: int | None = None
    
class SectionUserResponse(BaseModel):
    users: list[UserPublicBaseInfo]

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
    def check_role_not_invalid(cls, v):
        if v == UserSectionRole.CREATOR:
            raise ValueError("You can't change the user's role to CREATOR because there is only one creator in a section")
        return v
    
class LabelDeleteRequest(BaseModel):
    label_ids: list[int]

class SearchSubscribedSectionRequest(BaseModel):
    start: int | None = None
    limit: int = 10
    desc: bool | None = True
    keyword: str | None = None
    label_ids: list[int] | None = None

class SectionCommentInfo(BaseModel):
    id: int
    content: str
    create_time: datetime
    update_time: datetime
    creator: UserPublicInfo
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
    desc: bool | None = True

class SectionDetailRequest(BaseModel):
    section_id: int

class BaseSectionInfo(BaseModel):
    id: int
    title: str
    description: str
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
    desc: bool | None = True

class SearchPublicSectionsRequest(BaseModel):
    keyword: str | None = None
    start: int | None = None
    limit: int = 10
    desc: bool | None = True
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
    
class SectionInfo(BaseModel):
    id: int
    title: str
    creator: UserPublicInfo
    description: str
    public: bool
    documents_count: int 
    subscribers_count: int
    create_time: datetime
    update_time: datetime
    authority: int | None = None
    is_subscribed: bool | None = None
    md_file_name: str | None = None
    labels: list[Label] | None = None
    cover: str | None = None
    documents: list[SectionDocumentInfo] | None = None
    @field_serializer("cover")
    def cover(self, v: str) -> str | None:
        if v is None:
            return None
        url_prefix = RemoteFileServiceProtocol.get_user_file_system_url_prefix(user_id=self.creator.id)
        return f'{url_prefix}/{v}'
    @field_serializer("md_file_name")
    def md_file_name(self, v: str) -> str:
        url_prefix = RemoteFileServiceProtocol.get_user_file_system_url_prefix(user_id=self.creator.id)
        return f'{url_prefix}/{v}'
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

class SectionDeleteRequest(BaseModel):
    section_id: int
    
class DaySectionRequest(BaseModel):
    date: str

class DaySectionResponse(BaseModel):
    creator: UserPublicInfo
    date: str
    title: str
    description: str
    create_time: datetime
    update_time: datetime
    md_file_name: str | None = None
    documents: list[SectionDocumentInfo]
    @field_serializer("md_file_name")
    def md_file_name(self, v: str) -> str:
        url_prefix = RemoteFileServiceProtocol.get_user_file_system_url_prefix(user_id=self.creator.id)
        return f'{url_prefix}/{v}'
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

class SectionCreateRequest(BaseModel):
    title: str
    description: str
    public: bool
    cover: str | None = None
    labels: list[int]
    
class SectionCreateResponse(BaseModel):
    id: int

class SectionUpdateRequest(BaseModel):
    section_id: int
    title: str | None = None
    description: str | None = None
    public: bool | None = None
    cover: str | None = None
    documents: list[int] | None = None
    labels: list[int] | None = None