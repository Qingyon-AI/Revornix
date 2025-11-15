from pydantic import BaseModel, field_serializer
from datetime import datetime, timezone

class GenericFileSystemUploadResponse(BaseModel):
    file_path: str

class AliyunOSSPresignUploadURLRequest(BaseModel):
    file_path: str
    content_type: str
    
class AliyunOSSPresignUploadURLResponse(BaseModel):
    upload_url: str
    file_path: str
    fields: dict
    expiration: datetime
    
class S3PresignUploadURLRequest(BaseModel):
    file_path: str
    content_type: str
    
class S3PresignUploadURLResponse(BaseModel):
    upload_url: str
    file_path: str
    fields: dict
    expiration: datetime

class MigrateFileSystemRequest(BaseModel):
    source_user_file_system_id: int
    target_user_file_system_id: int

class FileUrlPrefixRequest(BaseModel):
    user_id: int

class FileUrlPrefixResponse(BaseModel):
    url_prefix: str

class FileSystemInfoRequest(BaseModel):
    file_system_id: int

class UserFileSystemInfoRequest(BaseModel):
    user_file_system_id: int
    
class UserFileSystemDeleteRequest(BaseModel):
    user_file_system_id: int
    
class UserFileSystemUpdateRequest(BaseModel):
    user_file_system_id: int
    config_json: str | None = None
    title: str | None = None
    description: str | None = None

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
    file_system_id: int
    title: str | None = None
    description: str | None = None
    demo_config: str | None = None
    config_json: str | None = None
    create_time: datetime
    update_time: datetime | None
    @field_serializer("create_time")
    def serializer_create_time(self, v: datetime):
        if v.tzinfo is None:
            return v.replace(tzinfo=timezone.utc)  # 默认转换为 UTC
        return v
    @field_serializer("update_time")
    def serializer_update_time(self, v: datetime | None):
        if v is None:
            return None
        if v.tzinfo is None:
            return v.replace(tzinfo=timezone.utc)  # 默认转换为 UTC
        return v
    class Config:
        from_attributes = True
        
class FileSystemSearchRequest(BaseModel):
    keyword: str
    
class ProvideFileSystemSearchResponse(BaseModel):
    data: list[FileSystemInfo]
    class Config:
        from_attributes = True
    
class MineFileSystemSearchResponse(BaseModel):
    data: list[UserFileSystemInfo]
    
class FileSystemInstallRequest(BaseModel):
    file_system_id: int
    title: str | None = None
    description: str | None = None
    config_json: str | None = None
    
class FileSystemInstallResponse(BaseModel):
    user_file_system_id: int
    
class FileSystemUnInstallRequest(BaseModel):
    user_file_system_id: int
    