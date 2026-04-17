from datetime import datetime
from typing import Literal

from pydantic import Field

from .base import BaseModel
from .user import UserPublicInfo

PUBLIC_PAGINATION_LIMIT = 20

class IOSTargetChangeCodeStatusRequest(BaseModel):
    code_uuid: str
    status: Literal["scanned", "confirm", "canceled"]
    device_token: str | None = None

class EmailTargetSendCodeRequest(BaseModel):
    email: str | None = None

class NotificationSourceForkRequest(BaseModel):
    notification_source_id: int
    status: bool
    
class NotificationTargetForkRequest(BaseModel):
    notification_target_id: int
    status: bool

class NotificationTemplateForkRequest(BaseModel):
    notification_template_id: int
    status: bool

class SearchNotificationTargetRequest(BaseModel):
    keyword: str | None = None
    start: int | None = None
    limit: int = Field(default=10, le=PUBLIC_PAGINATION_LIMIT)

class SearchNotificationSourceRequest(BaseModel):
    keyword: str | None = None
    start: int | None = None
    limit: int = Field(default=10, le=PUBLIC_PAGINATION_LIMIT)

class SearchNotificationTemplateRequest(BaseModel):
    keyword: str | None = None
    start: int | None = None
    limit: int = Field(default=10, le=PUBLIC_PAGINATION_LIMIT)

class NotificationTaskBaseInfo(BaseModel):
    id: int
    title: str
    create_time: datetime
    update_time: datetime | None

class GetNotificationTargetRelatedTaskRequest(BaseModel):
    notification_target_id: int

class GetNotificationTargetRelatedTaskResponse(BaseModel):
    data: list[NotificationTaskBaseInfo]

class GetNotificationSourceRelatedTaskRequest(BaseModel):
    notification_source_id: int

class GetNotificationSourceRelatedTaskResponse(BaseModel):
    data: list[NotificationTaskBaseInfo]

class TriggerEvent(BaseModel):
    id: int
    uuid: str
    name: str
    name_zh: str
    description: str | None
    description_zh: str | None
    create_time: datetime
    update_time: datetime | None
    attributes: list['TriggerEventAttribute'] = []

class TriggerEventAttribute(BaseModel):
    id: int
    key: str
    label: str
    label_zh: str | None = None
    description: str | None = None
    description_zh: str | None = None
    value_type: str
    required: bool

class TriggerEventsResponse(BaseModel):
    data: list[TriggerEvent]

class MessageVariant(BaseModel):
    title: str | None = None
    content: str | None = None
    content_type: str | None = None
    plain_content: str | None = None
    link: str | None = None
    cover: str | None = None


class Message(BaseModel):
    title: str
    content: str | None = None
    content_type: str | None = None
    plain_content: str | None = None
    link: str | None = None
    cover: str | None = None
    variants: dict[str, MessageVariant] | None = None

class NotificationSourceProvided(BaseModel):
    id: int
    uuid: str
    name: str
    name_zh: str
    category: str | None
    description: str | None
    description_zh: str | None
    create_time: datetime
    update_time: datetime | None

class NotificationTargetProvided(BaseModel):
    id: int
    uuid: str
    name: str
    name_zh: str
    category: str | None
    description: str | None
    description_zh: str | None
    create_time: datetime
    update_time: datetime | None

class NotificationSource(BaseModel):
    id: int
    title: str
    description: str | None
    notification_source_provided: NotificationSourceProvided
    create_time: datetime
    update_time: datetime | None
    creator: UserPublicInfo
    is_forked: bool | None = None
    is_public: bool

class NotificationSourceDetail(BaseModel):
    id: int
    title: str
    description: str | None
    notification_source_provided: NotificationSourceProvided
    create_time: datetime
    update_time: datetime | None
    config_json: str | None = None
    creator: UserPublicInfo
    is_public: bool

class NotificationTarget(BaseModel):
    id: int
    title: str
    notification_target_provided: NotificationTargetProvided
    description: str | None
    create_time: datetime
    update_time: datetime | None
    creator: UserPublicInfo
    is_forked: bool | None = None
    is_public: bool

class NotificationTargetDetail(BaseModel):
    id: int
    title: str
    notification_target_provided: NotificationTargetProvided
    description: str | None
    create_time: datetime
    update_time: datetime | None
    config_json: str | None = None
    creator: UserPublicInfo
    is_public: bool

class NotificationTargetsProvidedResponse(BaseModel):
    data: list[NotificationTargetProvided]

class NotificationTargetDetailRequest(BaseModel):
    notification_target_id: int

class NotificationSourceDetailRequest(BaseModel):
    notification_source_id: int

class NotificationTargetsResponse(BaseModel):
    data: list[NotificationTarget]

class NotificationSourcesProvidedResponse(BaseModel):
    data: list[NotificationSourceProvided]

class EmailTargetForm(BaseModel):
    email: str
    code: str

class IOSTargetForm(BaseModel):
    device_token: str

class FeiShuTargetForm(BaseModel):
    webhook_url: str
    sign: str

class DingTalkTargetForm(BaseModel):
    webhook_url: str
    sign: str

class TelegramTargetForm(BaseModel):
    chat_id: str

class AddNotificationTargetRequest(BaseModel):
    notification_target_provided_id: int
    title: str
    is_public: bool
    description: str | None = None
    email_target_form: EmailTargetForm | None = None
    ios_target_form: IOSTargetForm | None = None
    feishu_target_form: FeiShuTargetForm | None = None
    dingtalk_target_form: DingTalkTargetForm | None = None
    telegram_target_form: TelegramTargetForm | None = None

class EmailSourceForm(BaseModel):
    host: str
    port: int
    username: str
    password: str

class IOSSourceForm(BaseModel):
    team_id: str
    key_id: str
    private_key: str
    apns_topic: str

class FeiShuSourceForm(BaseModel):
    app_id: str
    app_secret: str

class TelegramSourceForm(BaseModel):
    bot_token: str

class AddNotificationSourceRequest(BaseModel):
    notification_source_provided_id: int
    title: str
    is_public: bool
    description: str | None = None
    email_source_form: EmailSourceForm | None = None
    ios_source_form: IOSSourceForm | None = None
    feishu_source_form: FeiShuSourceForm | None = None
    telegram_source_form: TelegramSourceForm | None = None

class UpdateNotificationSourceRequest(BaseModel):
    notification_source_id: int
    title: str | None = None
    description: str | None = None
    is_public: bool | None = None
    email_source_form: EmailSourceForm | None = None
    ios_source_form: IOSSourceForm | None = None
    feishu_source_form: FeiShuSourceForm | None = None
    telegram_source_form: TelegramSourceForm | None = None

class UpdateNotificationTargetRequest(BaseModel):
    notification_target_id: int
    title: str | None = None
    description: str | None = None
    is_public: bool | None = None
    email_target_form: EmailTargetForm | None = None
    ios_target_form: IOSTargetForm | None = None
    feishu_target_form: FeiShuTargetForm | None = None
    dingtalk_target_form: DingTalkTargetForm | None = None
    telegram_target_form: TelegramTargetForm | None = None

class DeleteNotificationTargetRequest(BaseModel):
    notification_target_ids: list[int]

class DeleteNotificationSourceRequest(BaseModel):
    notification_source_ids: list[int]

class NotificationRecordDetailRequest(BaseModel):
    notification_record_id: int

class SearchNotificationRecordRequest(BaseModel):
    keyword: str | None = None
    start: int | None = None
    limit: int = Field(default=10, le=PUBLIC_PAGINATION_LIMIT)

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
    creator: UserPublicInfo
    create_time: datetime
    update_time: datetime | None

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
    creator_id: int
    title: str
    enable: bool
    content_type: int
    trigger_type: int
    trigger_event: NotificationTriggerEvent | None = None
    trigger_scheduler: NotificationTriggerScheduler | None = None
    notification_title: str | None = None
    notification_content: str | None = None
    notification_link: str | None = None
    notification_cover: str | None = None
    notification_template_id: int | None = None
    notification_template_bindings: dict[str, 'NotificationTemplateBinding'] | None = None
    notification_source: NotificationSource | None = None
    notification_target: NotificationTarget | None = None
    create_time: datetime
    update_time: datetime | None

class DeleteNotificationTaskRequest(BaseModel):
    notification_task_ids: list[int]

class UpdateNotificationTaskRequest(BaseModel):
    notification_task_id: int
    title: str | None = None
    content_type: int | None = None
    enable: bool | None = None
    notification_template_id: int | None = None
    notification_template_bindings: dict[str, 'NotificationTemplateBinding'] | None = None
    trigger_type: int | None = None
    trigger_scheduler_cron: str | None = None
    trigger_event_id: int | None = None
    notification_title: str | None = None
    notification_content: str | None = None
    notification_link: str | None = None
    notification_cover: str | None = None
    notification_source_id: int | None = None
    notification_target_id: int | None = None

class AddNotificationTaskRequest(BaseModel):
    notification_source_id: int
    notification_target_id: int
    enable: bool
    title: str
    content_type: int
    notification_template_id: int | None = None
    notification_template_bindings: dict[str, 'NotificationTemplateBinding'] | None = None
    notification_title: str | None = None
    notification_content: str | None = None
    notification_cover: str | None = None
    notification_link: str | None = None
    trigger_type: int
    trigger_event_id: int | None = None
    trigger_scheduler_cron: str | None = None

class NotificationTemplate(BaseModel):
    id: int
    uuid: str
    creator_id: int
    is_public: bool = False
    name: str
    description: str | None = None
    title_template: str | None = None
    content_template: str | None = None
    link_template: str | None = None
    cover_template: str | None = None
    create_time: datetime
    update_time: datetime | None = None
    creator: UserPublicInfo
    is_forked: bool | None = None
    parameters: list['NotificationTemplateParameter'] = []

class NotificationTemplateParameter(BaseModel):
    id: int
    key: str
    label: str
    description: str | None = None
    value_type: str
    required: bool
    default_value: str | None = None

class NotificationTemplateBinding(BaseModel):
    source_type: Literal['event', 'static']
    attribute_key: str | None = None
    static_value: str | None = None

class NotificationTemplateUpsertRequest(BaseModel):
    notification_template_id: int | None = None
    name: str
    is_public: bool = False
    description: str | None = None
    title_template: str
    content_template: str | None = None
    link_template: str | None = None
    cover_template: str | None = None
    parameters: list['NotificationTemplateParameterUpsertRequest'] = []

class NotificationTemplateParameterUpsertRequest(BaseModel):
    key: str
    label: str
    description: str | None = None
    value_type: str = 'string'
    required: bool = False
    default_value: str | None = None

class DeleteNotificationTemplateRequest(BaseModel):
    notification_template_id: int

class NotificationTemplatesResponse(BaseModel):
    data: list[NotificationTemplate]

class NotificationSourcesUsableResponse(BaseModel):
    data: list[NotificationSource]

class NotificationTargetsUsableResponse(BaseModel):
    data: list[NotificationTarget]
