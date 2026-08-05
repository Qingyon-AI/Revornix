from datetime import datetime

from pydantic import ConfigDict
from .base import BaseModel


class ApiKeyCreateRequest(BaseModel):
    description: str

class ApiKeyCreateResponse(BaseModel):
    api_key_id: int
    api_key: str

class ApiKeyUpdateRequest(BaseModel):
    api_key_id: int
    description: str

class ApiKeysDeleteRequest(BaseModel):
    api_key_ids: list[int]

class SearchApiKeysRequest(BaseModel):
    keyword: str
    page_num: int
    page_size: int

class ApiKeyInfo(BaseModel):
    id: int
    api_key: str
    description: str
    create_time: datetime
    last_used_time: datetime | None = None

    model_config = ConfigDict(
        from_attributes=True,
        extra="ignore",
    )
