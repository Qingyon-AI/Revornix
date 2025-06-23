from pydantic import BaseModel, field_validator
from datetime import datetime, timezone

class UpdateNotificationSourceRequest(BaseModel):
    notification_source_id: int
    category: int
    title: str
    description: str
    email: str
    password: str

class AddNotificationSourceRequest(BaseModel):
    title: str
    description: str
    category: int
    email: str | None = None
    password: str | None = None
    address: str | None = None
    port: int | None = None
    
class EmailNotificationSource(BaseModel):
    id: int
    email: str
    password: str
    address: str
    port: int
    
class DeleteNotificationSourceRequest(BaseModel):
    notification_source_ids: list[int]

class NotificationDetailRequest(BaseModel):
    notification_id: int

class SearchNotificationRequest(BaseModel):
    keyword: str | None = None
    start: int | None = None
    limit: int = 10
    
class ReadNotificationRequest(BaseModel):
    notification_ids: list[int]
    status: bool
    
class UnreadNotificationRequest(BaseModel):
    notification_ids: list[int]
    
class Notification(BaseModel):
    id: int
    title: str
    content: str
    read_at: datetime | None = None
    create_time: datetime | None = None
    update_time: datetime | None = None
    link: str | None = None # 点击通知后跳转的页面
    @field_validator("read_at", mode="before")
    def ensure_read_at_timezone(cls, v: datetime) -> datetime:
        if v is not None and v.tzinfo is None:
            return v.replace(tzinfo=timezone.utc)  # 默认转换为 UTC
        return v
    @field_validator("create_time", mode="before")
    def ensure_create_time_timezone(cls, v: datetime) -> datetime:
        if v is not None and v.tzinfo is None:
            return v.replace(tzinfo=timezone.utc)  # 默认转换为 UTC
        return v
    @field_validator("update_time", mode="before")
    def ensure_update_time_timezone(cls, v: datetime) -> datetime:
        if v is not None and v.tzinfo is None:
            return v.replace(tzinfo=timezone.utc)  # 默认转换为 UTC
        return v
    
    class Config:
        from_attributes = True
    
class DeleteNotificationRequest(BaseModel):
    notification_ids: list[int]
    
class CreateNotificationRequest(BaseModel):
    title: str
    content: str
    link: str | None = None
    notification_type: int
    
class NotificationSource(BaseModel):
    id: int
    title: str
    description: str
    create_time: datetime | None = None
    update_time: datetime | None = None
    @field_validator("create_time", mode="before")
    def ensure_create_time_timezone(cls, v: datetime) -> datetime:
        if v is not None and v.tzinfo is None:
            return v.replace(tzinfo=timezone.utc)
        return v
    @field_validator("update_time", mode="before")
    def ensure_update_time_timezone(cls, v: datetime) -> datetime:
        if v is not None and v.tzinfo is None:
            return v.replace(tzinfo=timezone.utc)
        return v
    class Config:
        from_attributes = True
    
class NotificationSourcesResponse(BaseModel):
    data: list[NotificationSource]
    
class NotificationSourceDetailRequest(BaseModel):
    notification_source_id: int

class NotificationSourceDetail(BaseModel):
    id: int
    title: str
    description: str
    category: int
    email_notification_source: EmailNotificationSource | None = None