from datetime import datetime

from pydantic import BaseModel, ConfigDict


class ApiKeyCreateRequest(BaseModel):
    description: str

class ApiKeyCreateResponse(BaseModel):
    api_key_id: int

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
