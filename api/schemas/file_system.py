from datetime import datetime

from pydantic import ConfigDict
from .base import BaseModel

class GenericFileSystemUploadResponse(BaseModel):
    file_path: str
    stored_file_id: int | None = None

class PresignUploadURLRequest(BaseModel):
    file_path: str
    content_type: str

class PresignUploadURLResponse(BaseModel):
    upload_url: str
    file_path: str
    expiration: datetime
    fields: dict | None = None
    stored_file_id: int | None = None

class MigrateFileSystemRequest(BaseModel):
    source_user_file_system_id: int
    target_user_file_system_id: int
    stored_file_ids: list[int] | None = None

class StoredFileSearchRequest(BaseModel):
    keyword: str | None = None
    user_file_system_id: int | None = None
    start: int | None = None
    limit: int = 50

class StoredFileInfo(BaseModel):
    id: int
    owner_user_id: int
    user_file_system_id: int
    file_system_id: int
    path: str
    content_type: str | None = None
    size_bytes: int | None = None
    source: str | None = None
    create_time: datetime
    update_time: datetime | None = None

    model_config = ConfigDict(
        from_attributes=True,
        extra="ignore",
    )

class StoredFileSearchResponse(BaseModel):
    total: int
    start: int | None = None
    limit: int
    has_more: bool
    next_start: int | None = None
    data: list[StoredFileInfo]

class StoredFileSyncRequest(BaseModel):
    user_file_system_id: int | None = None

class StoredFileSyncResponse(BaseModel):
    synced: int
    candidates: int
    total: int

class StoredFileMigrateResponse(BaseModel):
    migrated: int
    skipped: int
    failed: int

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

    model_config = ConfigDict(
        from_attributes=True,
        extra="ignore",
    )

class UserFileSystemInfo(BaseModel):
    id: int
    file_system_id: int
    title: str
    description: str | None = None
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
