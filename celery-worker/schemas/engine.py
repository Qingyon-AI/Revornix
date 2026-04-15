from pydantic import ConfigDict
from .base import BaseModel
from datetime import datetime

class EngineInfo(BaseModel):
    id: int
    name: str
    name_zh: str
    description: str | None = None
    description_zh: str | None = None

    model_config = ConfigDict(
        from_attributes=True,
        extra="ignore",
    )
        
class UserEngineInfo(BaseModel):
    id: int
    name: str
    name_zh: str
    description: str | None = None
    description_zh: str | None = None
    enable: bool | None = None
    config_json: str | None = None
    create_time: datetime
    update_time: datetime | None

    model_config = ConfigDict(
        from_attributes=True,
        extra="ignore",
    )
