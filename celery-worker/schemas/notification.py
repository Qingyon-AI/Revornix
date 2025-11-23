from pydantic import BaseModel, field_serializer
from datetime import datetime, timezone

class NotificationTaskBaseInfo(BaseModel):
    id: int
    title: str
    create_time: datetime
    update_time: datetime | None
    @field_serializer("create_time")
    def serializer_create_time(self, v: datetime):
        if v is not None and v.tzinfo is None:
            return v.replace(tzinfo=timezone.utc)
        return v
    @field_serializer("update_time")
    def serializer_update_time(self, v: datetime | None):
        if v is not None and v.tzinfo is None:
            return v.replace(tzinfo=timezone.utc)
        return v
    class Config:
        from_attributes = True

class GetNotificationTargetRelatedTaskRequest(BaseModel):
    user_notification_target_id: int

class GetNotificationTargetRelatedTaskResponse(BaseModel):
    data: list[NotificationTaskBaseInfo]
    class Config:
        from_attributes = True

class GetNotificationSourceRelatedTaskRequest(BaseModel):
    user_notification_source_id: int

class GetNotificationSourceRelatedTaskResponse(BaseModel):
    data: list[NotificationTaskBaseInfo]
    class Config:
        from_attributes = True

class TriggerEvent(BaseModel):
    id: int
    uuid: str
    name: str
    name_zh: str
    description: str | None
    description_zh: str | None
    create_time: datetime
    update_time: datetime | None
    @field_serializer("create_time")
    def serializer_create_time(self, v: datetime):
        if v is not None and v.tzinfo is None:
            return v.replace(tzinfo=timezone.utc)
        return v
    @field_serializer("update_time")
    def serializer_update_time(self, v: datetime | None):
        if v is not None and v.tzinfo is None:
            return v.replace(tzinfo=timezone.utc)
        return v
    class Config:
        from_attributes = True

class TriggerEventsResponse(BaseModel):
    data: list[TriggerEvent]
    class Config:
        from_attributes = True

class Message(BaseModel):
    title: str
    cover: str | None = None
    content: str | None = None
    link: str | None = None

class NotificationSource(BaseModel):
    id: int
    uuid: str
    name: str
    name_zh: str 
    description: str | None
    description_zh: str | None
    create_time: datetime
    update_time: datetime | None
    demo_config: str | None
    @field_serializer("create_time")
    def serializer_create_time(self, v: datetime):
        if v is not None and v.tzinfo is None:
            return v.replace(tzinfo=timezone.utc)
        return v
    @field_serializer("update_time")
    def serializer_update_time(self, v: datetime | None):
        if v is not None and v.tzinfo is None:
            return v.replace(tzinfo=timezone.utc)
        return v
    class Config:
        from_attributes = True

class NotificationTarget(BaseModel):
    id: int
    uuid: str
    name: str
    name_zh: str 
    description: str | None
    description_zh: str | None
    create_time: datetime
    update_time: datetime | None
    demo_config: str | None
    @field_serializer("create_time")
    def serializer_create_time(self, v: datetime):
        if v is not None and v.tzinfo is None:
            return v.replace(tzinfo=timezone.utc)
        return v
    @field_serializer("update_time")
    def serializer_update_time(self, v: datetime | None):
        if v is not None and v.tzinfo is None:
            return v.replace(tzinfo=timezone.utc)
        return v
    class Config:
        from_attributes = True

class NotificationSourcesResponse(BaseModel):
    data: list[NotificationSource]

class NotificationTargetsResponse(BaseModel):
    data: list[NotificationTarget]

class UserNotificationSource(BaseModel):
    id: int
    title: str
    description: str | None
    notification_source_id: int
    create_time: datetime
    update_time: datetime | None
    config_json: str | None
    @field_serializer("create_time")
    def serializer_create_time(self, v: datetime):
        if v is not None and v.tzinfo is None:
            return v.replace(tzinfo=timezone.utc)
        return v
    @field_serializer("update_time")
    def serializer_update_time(self, v: datetime | None):
        if v is not None and v.tzinfo is None:
            return v.replace(tzinfo=timezone.utc)
        return v
    class Config:
        from_attributes = True

class UserNotificationTarget(BaseModel):
    id: int
    title: str
    notification_target_id: int
    description: str | None
    create_time: datetime
    update_time: datetime | None
    config_json: str | None
    @field_serializer("create_time")
    def serializer_create_time(self, v: datetime):
        if v is not None and v.tzinfo is None:
            return v.replace(tzinfo=timezone.utc)  # 默认转换为 UTC
        return v
    @field_serializer("update_time")
    def serializer_update_time(self, v: datetime | None):
        if v is not None and v.tzinfo is None:
            return v.replace(tzinfo=timezone.utc)  # 默认转换为 UTC
        return v
    class Config:
        from_attributes = True

class UserNotificationTargetDetailRequest(BaseModel):
    user_notification_target_id: int

class UserNotificationSourceDetailRequest(BaseModel):
    user_notification_source_id: int

class UserNotificationTargetsResponse(BaseModel):
    data: list[UserNotificationTarget]
    
class UserNotificationSourcesResponse(BaseModel):
    data: list[UserNotificationSource]

class AddNotificationSourceRequest(BaseModel):
    notification_source_id: int
    title: str
    description: str | None = None
    config_json: str | None = None

class AddNotificationTargetRequest(BaseModel):
    notification_target_id: int
    title: str
    description: str | None = None
    config_json: str | None = None

class UpdateNotificationSourceRequest(BaseModel):
    user_notification_source_id: int
    notification_source_id: int | None = None
    title: str | None = None
    description: str | None = None
    config_json: str | None = None

class UpdateNotificationTargetRequest(BaseModel):
    user_notification_target_id: int
    notification_target_id: int | None = None
    title: str | None = None
    description: str | None = None
    config_json: str | None = None
    
class DeleteUserNotificationTargetRequest(BaseModel):
    user_notification_target_ids: list[int]

class DeleteUserNotificationSourceRequest(BaseModel):
    user_notification_source_ids: list[int]
    
class NotificationRecordDetailRequest(BaseModel):
    notification_record_id: int

class SearchNotificationRecordRequest(BaseModel):
    keyword: str | None = None
    start: int | None = None
    limit: int = 10
    
class ReadNotificationRecordRequest(BaseModel):
    notification_record_ids: list[int]
    status: bool

class NotificationRecord(BaseModel):
    id: int
    title: str
    content: str | None
    read_at: datetime | None
    link: str | None
    cover: str | None
    create_time: datetime
    update_time: datetime | None
    @field_serializer("read_at")
    def serializer_read_at(self, v: datetime | None):
        if v is not None and v.tzinfo is None:
            return v.replace(tzinfo=timezone.utc)
        return v
    @field_serializer("create_time")
    def serializer_create_time(self, v: datetime):
        if v is not None and v.tzinfo is None:
            return v.replace(tzinfo=timezone.utc)
        return v
    @field_serializer("update_time")
    def serializer_update_time(self, v: datetime | None):
        if v is not None and v.tzinfo is None:
            return v.replace(tzinfo=timezone.utc)
        return v
    class Config:
        from_attributes = True
    
class DeleteNotificationRecordRequest(BaseModel):
    notification_record_ids: list[int]
    
class NotificationTaskDetailRequest(BaseModel):
    notification_task_id: int
    
class NotificationTriggerEvent(BaseModel):
    trigger_event_id: int
    
class NotificationTriggerScheduler(BaseModel):
    cron_expr: str

class NotificationTask(BaseModel):
    id: int
    title: str
    enable: bool
    notification_content_type: int
    trigger_type: int
    trigger_event: NotificationTriggerEvent | None = None
    trigger_scheduler: NotificationTriggerScheduler | None = None
    notification_title: str | None = None
    notification_content: str | None = None
    notification_link: str | None = None
    notification_cover: str | None = None
    notification_template_id: int | None = None
    user_notification_source: UserNotificationSource | None = None
    user_notification_target: UserNotificationTarget | None = None
    create_time: datetime
    update_time: datetime | None
    @field_serializer("create_time")
    def serializer_create_time(self, v: datetime):
        if v is not None and v.tzinfo is None:
            return v.replace(tzinfo=timezone.utc)
        return v
    @field_serializer("update_time")
    def serializer_update_time(self, v: datetime | None):
        if v is not None and v.tzinfo is None:
            return v.replace(tzinfo=timezone.utc)
        return v
    class Config:
        from_attributes = True

class DeleteNotificationTaskRequest(BaseModel):
    notification_task_ids: list[int]
    
class UpdateNotificationTaskRequest(BaseModel):
    notification_task_id: int
    title: str | None = None
    notification_content_type: int | None = None
    enable: bool | None = None
    notification_template_id: int | None = None
    trigger_type: int | None = None
    trigger_scheduler_cron: str | None = None
    trigger_event_id: int | None = None
    notification_title: str | None = None
    notification_content: str | None = None
    notification_link: str | None = None
    notification_cover: str | None = None
    user_notification_source_id: int | None = None
    user_notification_target_id: int | None = None
    
class AddNotificationTaskRequest(BaseModel):
    user_notification_source_id: int
    user_notification_target_id: int
    enable: bool
    title: str
    notification_content_type: int
    notification_template_id: int | None = None
    notification_title: str | None = None
    notification_content: str | None = None
    notification_link: str | None = None
    notification_cover: str | None = None
    trigger_type: int
    trigger_event_id: int | None = None
    trigger_scheduler_cron: str | None = None
    
class NotificationTemplate(BaseModel):
    id: int
    uuid: str
    name: str
    name_zh: str
    description: str | None = None
    description_zh: str | None = None
    
class NotificationTemplatesResponse(BaseModel):
    data: list[NotificationTemplate]