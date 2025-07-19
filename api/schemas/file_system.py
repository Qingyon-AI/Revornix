from pydantic import BaseModel, field_validator
from datetime import datetime, timezone

class OssStsResponse(BaseModel):
    access_key_id: str
    access_key_secret: str
    security_token: str

class FileSystemInfoRequest(BaseModel):
    file_system_id: int
    
class FileSystemUpdateRequest(BaseModel):
    file_system_id: int
    config_json: str

class FileSystemInfo(BaseModel):
    id: int
    name: str
    name_zh: str
    description: str | None = None
    description_zh: str | None = None
    demo_config: str | None = None
    class Config:
        from_attributes = True
        
class UserFileSystemInfo(BaseModel):
    id: int
    name: str
    name_zh: str
    description: str | None = None
    description_zh: str | None = None
    demo_config: str | None = None
    config_json: str | None = None
    create_time: datetime
    update_time: datetime
    @field_validator("create_time", mode="before")
    def ensure_create_timezone(cls, v: datetime) -> datetime:
        if v.tzinfo is None:
            return v.replace(tzinfo=timezone.utc)  # 默认转换为 UTC
        return v
    @field_validator("update_time", mode="before")
    def ensure_update_timezone(cls, v: datetime) -> datetime:
        if v.tzinfo is None:
            return v.replace(tzinfo=timezone.utc)  # 默认转换为 UTC
        return v
    class Config:
        from_attributes = True
        
class FileSystemSearchRequest(BaseModel):
    keyword: str
    
class ProvideFileSystemSearchResponse(BaseModel):
    data: list[FileSystemInfo]
    
class MineFileSystemSearchResponse(BaseModel):
    data: list[UserFileSystemInfo]
    
class FileSystemInstallRequest(BaseModel):
    file_system_id: int
    status: bool
    