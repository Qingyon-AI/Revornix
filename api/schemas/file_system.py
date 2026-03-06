from datetime import datetime

from pydantic import ConfigDict
from .base import BaseModel

class GenericFileSystemUploadResponse(BaseModel):
    file_path: str

class PresignUploadURLRequest(BaseModel):
    file_path: str
    content_type: str

class PresignUploadURLResponse(BaseModel):
    upload_url: str
    file_path: str
    expiration: datetime
    fields: dict | None = None

class MigrateFileSystemRequest(BaseModel):
    source_user_file_system_id: int
    target_user_file_system_id: int

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

    model_config = ConfigDict(
        from_attributes=True,
        extra="ignore",
    )

class UserFileSystemInfo(BaseModel):
    id: int
    file_system_id: int
    title: str
    description: str | None = None
    demo_config: str | None = None
    create_time: datetime
    update_time: datetime | None

    model_config = ConfigDict(
        from_attributes=True,
        extra="ignore",
    )

class UserFileSystemDetail(BaseModel):
    id: int
    file_system_id: int
    title: str
    description: str | None = None
    demo_config: str | None = None
    config_json: str | None = None
    create_time: datetime
    update_time: datetime | None

    model_config = ConfigDict(
        from_attributes=True,
        extra="ignore",
    )

class FileSystemSearchRequest(BaseModel):
    keyword: str

class ProvideFileSystemSearchResponse(BaseModel):
    data: list[FileSystemInfo]

    model_config = ConfigDict(
        from_attributes=True,
        extra="ignore",
    )

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
