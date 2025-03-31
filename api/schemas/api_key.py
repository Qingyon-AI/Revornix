from pydantic import BaseModel, field_validator
from datetime import datetime

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
    
    class Config:
        from_attrbutes = True