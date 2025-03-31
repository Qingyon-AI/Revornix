from pydantic import BaseModel, field_validator
from datetime import datetime, timezone
from .attachment import AttachmentInfo
from .user import UserPublicInfo

class SearchSubscribedSectionRequest(BaseModel):
    user_id: int
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
    is_subscribed: bool | None = None
    md_file_name: str | None = None
    labels: list[Label] | None = None
    cover: AttachmentInfo | None = None
    documents: list[SectionDocumentInfo] | None = None
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
    date: str
    title: str
    description: str
    create_time: datetime
    update_time: datetime
    md_file_name: str | None = None
    documents: list[SectionDocumentInfo]
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
    cover_id: int | None = None
    labels: list[int]
    
class SectionCreateResponse(BaseModel):
    id: int

class SectionUpdateRequest(BaseModel):
    section_id: int
    title: str | None = None
    description: str | None = None
    public: bool | None = None
    cover_id: int | None = None
    documents: list[int] | None = None
    labels: list[int] | None = None