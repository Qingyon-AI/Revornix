from pydantic import BaseModel, field_validator
from datetime import datetime, timezone

class Message(BaseModel):
    title: str
    content: str

class NotificationTargetDetailRequest(BaseModel):
    notification_target_id: int

class NotificationTarget(BaseModel):
    id: int
    title: str
    description: str
    category: int
    create_time: datetime | None = None
    update_time: datetime | None = None
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
    
class NotificationTargetsResponse(BaseModel):
    data: list[NotificationTarget]

class AddNotificationTargetRequest(BaseModel):
    category: int
    title: str
    description: str | None = None
    email: str | None = None
    
class UpdateNotificationTargetRequest(BaseModel):
    notification_target_id: int
    title: str | None = None
    description: str | None = None
    email: str | None = None
    
class DeleteNotificationTargetRequest(BaseModel):
    notification_target_ids: list[int]
    
class EmailNotificationTarget(BaseModel):
    id: int
    email: str
    
class NotificationTargetDetail(BaseModel):
    id: int
    title: str
    description: str
    category: int
    email_notification_target: EmailNotificationTarget | None = None

class UpdateNotificationSourceRequest(BaseModel):
    notification_source_id: int
    title: str | None = None
    description: str | None = None
    email: str | None = None
    password: str | None = None
    server: str | None = None
    port: int | None = None

class AddNotificationSourceRequest(BaseModel):
    title: str
    description: str
    category: int
    email: str | None = None
    password: str | None = None
    server: str | None = None
    port: int | None = None
    
class EmailNotificationSource(BaseModel):
    id: int
    email: str
    password: str
    server: str
    port: int
    
class DeleteNotificationSourceRequest(BaseModel):
    notification_source_ids: list[int]

class NotificationRecordDetailRequest(BaseModel):
    notification_record_id: int

class SearchNotificationRecordRequest(BaseModel):
    keyword: str | None = None
    start: int | None = None
    limit: int = 10
    
class ReadNotificationRecordRequest(BaseModel):
    notification_record_ids: list[int]
    status: bool
    
class UnreadNotificationRecordRequest(BaseModel):
    notification_record_ids: list[int]
    
class NotificationRecord(BaseModel):
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
    
class DeleteNotificationRecordRequest(BaseModel):
    notification_record_ids: list[int]
    
class CreateNotificationRecordRequest(BaseModel):
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

class NotificationTask(BaseModel):
    id: int
    title: str
    content: str
    cron_expr: str
    enable: bool
    notification_source_id: int
    notification_target_id: int
    notification_source: NotificationSource | None = None
    notification_target: NotificationTarget | None = None
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

class DeleteNotificationTaskRequest(BaseModel):
    notification_task_ids: list[int]
    
class UpdateNotificationTaskRequest(BaseModel):
    notification_task_id: int
    enable: bool | None = None
    cron_expr: str | None = None
    title: str | None = None
    content: str | None = None
    notification_source_id: int | None = None
    notification_target_id: int | None = None
    
class AddNotificationTaskRequest(BaseModel):
    title: str
    content: str
    cron_expr: str
    enable: bool
    notification_source_id: int
    notification_target_id: int
    
class NotificationTaskResponse(BaseModel):
    data: list[NotificationTask]
    
class NotificationTaskDetailRequest(BaseModel):
    notification_task_id: int