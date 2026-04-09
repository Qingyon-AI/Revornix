from datetime import datetime

from pydantic import ConfigDict, Field, model_validator

from .base import BaseModel
from .user import UserPublicInfo
from enums.engine_enums import EngineCategory
from enums.billing import EngineBillingMode

PUBLIC_PAGINATION_LIMIT = 20


class EngineProvidedInfo(BaseModel):
    id: int
    category: int
    name: str
    name_zh: str
    description: str | None = None
    description_zh: str | None = None
    demo_config: str | None = None

class EngineProvidedSearchRequest(BaseModel):
    keyword: str
    filter_category: EngineCategory | None = None

class EngineProvidedSearchResponse(BaseModel):
    data: list[EngineProvidedInfo]

    model_config = ConfigDict(
        from_attributes=True,
        extra="ignore",
    )

class EngineCreateRequest(BaseModel):
    name: str
    description: str | None = None
    is_public: bool
    engine_provided_id: int
    required_plan_level: int = 0
    is_official_hosted: bool = False
    billing_mode: EngineBillingMode = EngineBillingMode.TOKEN
    billing_unit_price: float = Field(default=1.0, gt=0)
    compute_point_multiplier: float = Field(default=1.0, gt=0)
    config_json: str | None = None

    @model_validator(mode="after")
    def normalize_related_fields(self):
        self.name = self.name.strip()
        if self.description is not None:
            description = self.description.strip()
            self.description = description or None
        if self.config_json is not None:
            config_json = self.config_json.strip()
            self.config_json = config_json or None
        if not self.is_public:
            self.required_plan_level = 0
        return self

class EngineDetailRequest(BaseModel):
    engine_id: int

class ImageGenerateRequest(BaseModel):
    prompt: str
    engine_id: int | None = None

    @model_validator(mode="after")
    def normalize_prompt(self):
        self.prompt = self.prompt.strip()
        return self

class ImageGenerateResponse(BaseModel):
    success: bool = True
    message: str = "Success"
    code: int = 200
    prompt: str
    image_markdown: str
    data_url: str

class EngineDetail(BaseModel):
    id: int
    uuid: str
    category: int
    name: str
    description: str | None = None
    is_public: bool
    required_plan_level: int = 0
    is_official_hosted: bool = False
    billing_mode: int = int(EngineBillingMode.TOKEN)
    billing_unit_price: float = 1.0
    compute_point_multiplier: float = 1.0
    subscription_required: bool = False
    create_time: datetime
    update_time: datetime | None = None
    config_json: str | None = None
    creator: UserPublicInfo
    engine_provided: EngineProvidedInfo
        
class EngineBaseInfo(BaseModel):
    id: int
    uuid: str
    name: str
    description: str | None = None
    is_public: bool
    required_plan_level: int = 0
    is_official_hosted: bool = False
    billing_mode: int = int(EngineBillingMode.TOKEN)
    billing_unit_price: float = 1.0
    compute_point_multiplier: float = 1.0
    create_time: datetime
    update_time: datetime | None = None
    is_forked: bool | None = None
    subscription_required: bool = False
    creator: UserPublicInfo
    engine_provided: EngineProvidedInfo

class EngineInfo(BaseModel):
    id: int
    uuid: str
    category: int
    name: str
    description: str | None = None
    is_public: bool
    required_plan_level: int = 0
    is_official_hosted: bool = False
    billing_mode: int = int(EngineBillingMode.TOKEN)
    billing_unit_price: float = 1.0
    compute_point_multiplier: float = 1.0
    subscription_required: bool = False
    create_time: datetime
    update_time: datetime | None = None
    is_forked: bool | None = None
    creator: UserPublicInfo
    engine_provided: EngineProvidedInfo

class UsableEnginesResponse(BaseModel):
    data: list[EngineInfo]

class UsableEngineSearchRequest(BaseModel):
    keyword: str | None = None
    filter_category: EngineCategory | None = None

class CommunityEngineSearchRequest(BaseModel):
    keyword: str | None = None
    start: int | None = None
    limit: int = Field(default=10, le=PUBLIC_PAGINATION_LIMIT)
    filter_category: EngineCategory | None = None

class EngineDeleteRequest(BaseModel):
    engine_id: int

class EngineForkRequest(BaseModel):
    engine_id: int
    status: bool

class EngineUpdateRequest(BaseModel):
    engine_id: int
    config_json: str| None = None
    name: str | None = None
    description: str | None = None
    is_public: bool | None = None
    required_plan_level: int | None = None
    is_official_hosted: bool | None = None
    billing_mode: EngineBillingMode | None = None
    billing_unit_price: float | None = Field(default=None, gt=0)
    compute_point_multiplier: float | None = Field(default=None, gt=0)

    @model_validator(mode="after")
    def normalize_related_fields(self):
        if self.name is not None:
            self.name = self.name.strip()
        if self.description is not None:
            description = self.description.strip()
            self.description = description or None
        if self.config_json is not None:
            config_json = self.config_json.strip()
            self.config_json = config_json or None
        if self.is_public is False:
            self.required_plan_level = 0
        return self


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
