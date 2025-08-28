from pydantic import BaseModel, field_validator
from datetime import datetime, timezone
from schemas.common import BaseResponseModel

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
    device_token: str | None = None
    
class UpdateNotificationTargetRequest(BaseModel):
    notification_target_id: int
    title: str | None = None
    description: str | None = None
    email: str | None = None
    device_token: str | None = None
    
class DeleteNotificationTargetRequest(BaseModel):
    notification_target_ids: list[int]
    
class EmailNotificationTarget(BaseModel):
    id: int
    email: str
    
class IOSNotificationTarget(BaseModel):
    id: int
    device_token: str
    
class NotificationTargetDetail(BaseModel):
    id: int
    title: str
    description: str
    category: int
    email_notification_target: EmailNotificationTarget | None = None
    ios_notification_target: IOSNotificationTarget | None = None

class UpdateNotificationSourceRequest(BaseModel):
    notification_source_id: int
    title: str | None = None
    description: str | None = None
    email: str | None = None
    password: str | None = None
    server: str | None = None
    port: int | None = None
    key_id: str | None = None
    team_id: str | None = None
    private_key: str | None = None
    app_bundle_id: str | None = None

class AddNotificationSourceRequest(BaseModel):
    title: str
    description: str
    category: int
    email: str | None = None
    password: str | None = None
    server: str | None = None
    port: int | None = None
    key_id: str | None = None
    team_id: str | None = None
    private_key: str | None = None
    app_bundle_id: str | None = None
    
class EmailNotificationSource(BaseModel):
    id: int
    email: str
    password: str
    server: str
    port: int
    
class IOSNotificationSource(BaseModel):
    id: int
    key_id: str
    team_id: str
    private_key: str
    app_bundle_id: str
    
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
    ios_notification_source: IOSNotificationSource | None = None

class NotificationTask(BaseResponseModel):
    id: int
    cron_expr: str
    enable: bool
    notification_source_id: int
    notification_target_id: int
    notification_content_type: int
    title: str | None = None
    content: str | None = None
    notification_template_id: int | None = None
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
    notification_content_type: int | None = None
    enable: bool | None = None
    notification_template_id: int | None = None
    cron_expr: str | None = None
    title: str | None = None
    content: str | None = None
    notification_source_id: int | None = None
    notification_target_id: int | None = None
    
class AddNotificationTaskRequest(BaseModel):
    title: str | None = None
    content: str | None = None
    notification_template_id: int | None = None
    notification_content_type: int
    cron_expr: str
    enable: bool
    notification_source_id: int
    notification_target_id: int
    
class NotificationTaskResponse(BaseResponseModel):
    data: list[NotificationTask]
    
class NotificationTaskDetailRequest(BaseModel):
    notification_task_id: int
    
class NotificationTemplate(BaseModel):
    id: int
    name: str
    name_zh: str
    description: str | None = None
    description_zh: str | None = None
    version: str
    
class NotificationTemplatesResponse(BaseResponseModel):
    data: list[NotificationTemplate]