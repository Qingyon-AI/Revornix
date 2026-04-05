from datetime import datetime

from pydantic import ConfigDict, Field, model_validator

from .base import BaseModel
from .user import UserPublicInfo


class ModelProviderForkRequest(BaseModel):
    provider_id: int
    status: bool

class ModelCreateRequest(BaseModel):
    name: str
    description: str | None = None
    required_plan_level: int = 0
    provider_id: int
    is_official_hosted: bool = False
    compute_point_multiplier: float = Field(default=1.0, gt=0)

    @model_validator(mode="after")
    def normalize_billing_fields(self):
        self.name = self.name.strip()
        if self.description is not None:
            description = self.description.strip()
            self.description = description or None
        if not self.is_official_hosted:
            self.compute_point_multiplier = 1.0
        return self

class ModelCreateResponse(BaseModel):
    id: int

class ModelProviderDetail(BaseModel):
    id: int
    uuid: str
    name: str
    is_public: bool
    description: str | None
    api_key: str | None = None
    base_url: str | None = None
    create_time: datetime
    update_time: datetime | None
    creator: UserPublicInfo

    model_config = ConfigDict(
        from_attributes=True,
        extra="ignore",
    )

class ModelProvider(BaseModel):
    id: int
    uuid: str
    name: str
    is_forked: bool | None = None
    is_public: bool
    description: str | None
    create_time: datetime
    update_time: datetime | None
    creator: UserPublicInfo

    model_config = ConfigDict(
        from_attributes=True,
        extra="ignore",
    )

class Model(BaseModel):
    id: int
    uuid: str
    name: str
    description: str | None
    required_plan_level: int = 0
    is_official_hosted: bool = False
    compute_point_multiplier: float = 1.0
    subscription_required: bool = False
    create_time: datetime
    update_time: datetime | None

    provider: ModelProvider

    model_config = ConfigDict(
        from_attributes=True,
        extra="ignore",
    )

class ModelProviderCreateRequest(BaseModel):
    name: str
    description: str | None = None
    api_key: str | None = None
    base_url: str
    is_public: bool

class ModelProviderCreateResponse(BaseModel):
    id: int

class ModelRequest(BaseModel):
    model_id: int

class ModelProviderRequest(BaseModel):
    provider_id: int

class DeleteModelRequest(BaseModel):
    model_ids: list[int]

class DeleteModelProviderRequest(BaseModel):
    provider_id: int

class ModelSearchRequest(BaseModel):
    keyword: str | None = None
    provider_id: int | None = None

class ModelSearchResponse(BaseModel):
    data: list[Model] | None = None
    model_config = ConfigDict(
        from_attributes=True,
        extra="ignore",
    )

class ModelProviderSearchRequest(BaseModel):
    keyword: str | None = None
    start: int | None = None
    limit: int = 10

class ModelUpdateRequest(BaseModel):
    id: int
    name: str | None = None
    description: str | None = None
    required_plan_level: int | None = None
    is_official_hosted: bool | None = None
    compute_point_multiplier: float | None = Field(default=None, gt=0)

    @model_validator(mode="after")
    def normalize_billing_fields(self):
        if self.name is not None:
            self.name = self.name.strip()
        if self.description is not None:
            description = self.description.strip()
            self.description = description or None
        if self.is_official_hosted is False:
            self.compute_point_multiplier = 1.0
        return self

class ModelProviderUpdateRequest(BaseModel):
    id: int
    name: str | None = None
    description: str | None = None
    api_key: str | None = None
    base_url: str | None = None
    is_public: bool | None = None

class ChatItem(BaseModel):
    chat_id: str
    content: str
    role: str
    images: list[str] = Field(default_factory=list)

class ChatMessages(BaseModel):
    messages: list[ChatItem]
    enable_mcp: bool = False


class BillingAuditIssue(BaseModel):
    code: str
    severity: str
    resource_id: int
    resource_uuid: str
    resource_name: str
    provider_name: str | None = None
    title: str
    description: str


class BillingAuditResponse(BaseModel):
    items: list[BillingAuditIssue]
