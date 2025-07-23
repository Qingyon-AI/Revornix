from pydantic import BaseModel, field_serializer
from .attachment import AttachmentInfo
from protocol.remote_file_service import RemoteFileServiceProtocol

class DefaultFileSystemUpdateRequest(BaseModel):
    default_user_file_system: int | None = None

class DefaultReadMarkReasonUpdateRequest(BaseModel):
    default_read_mark_reason: int

class DefaultEngineUpdateRequest(BaseModel):
    default_website_document_parse_engine_id: int | None = None
    default_file_document_parse_engine_id: int | None = None

class DefaultModelUpdateRequest(BaseModel):
    default_document_reader_model_id: int | None = None
    default_revornix_model_id: int | None = None

class DailyReportStatusChangeRequest(BaseModel):
    status: bool
    run_time: str | None = None # "00:00:00" 格式

class BindEmailVerifyRequest(BaseModel):
    email: str
    
class SearchUserFansRequest(BaseModel):
    user_id: int
    start: int | None = None
    limit: int = 10
    keyword: str | None = None
    
class SearchUserFollowsRequest(BaseModel):
    user_id: int
    start: int | None = None
    limit: int = 10
    keyword: str | None = None

class FollowUserRequest(BaseModel):
    to_user_id: int
    status: bool

class EmailCreateRequest(BaseModel):
    email: str
    
class EmailUserCreateVerifyRequest(BaseModel):
    email: str
    password: str
    
class TokenUpdateRequest(BaseModel):
    refresh_token: str
    
class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    expires_in: int
    
class PasswordUpdateRequest(BaseModel):
    origin_password: str
    new_password: str

class UserInfoUpdateRequest(BaseModel):
    nickname: str | None = None
    avatar_attachment_id: int | None = None
    slogan: str | None = None
    
class UserLoginRequest(BaseModel):
    email: str
    password: str
    
class InitialPasswordResponse(BaseModel):
    password: str

class EmailInfo(BaseModel):
    email: str
    is_initial_password: bool
    has_seen_initial_password: bool
    
class PrivateUserInfo(BaseModel):
    id: int
    uuid: str
    fans: int | None = None
    follows: int | None = None
    avatar: AttachmentInfo | None = None
    nickname: str | None = None
    slogan: str | None = None
    email_info: EmailInfo | None = None
    default_user_file_system: int | None = None
    default_read_mark_reason: int | None = None
    default_document_reader_model_id: int | None = None
    default_revornix_model_id: int | None = None
    default_website_document_parse_engine_id: int | None = None
    default_file_document_parse_engine_id: int | None = None
    
    @field_serializer("avatar")
    def serialize_avatar(self, v):
        url_prefix = RemoteFileServiceProtocol.get_user_file_system_url_prefix(user_id=self.id)
        return AttachmentInfo(
            id=v.id,
            name=f'{url_prefix}/{v.name}',
        )

    class Config:
        from_attributes = True
        
class UserInfoRequest(BaseModel):
    user_id: int
        
class UserPublicInfo(BaseModel):
    id: int
    nickname: str | None = None
    avatar: AttachmentInfo | None = None
    slogan: str | None = None
    is_followed: bool | None = None
    fans: int | None = None
    follows: int | None = None
    
    @field_serializer("avatar")
    def serialize_avatar(self, v):
        url_prefix = RemoteFileServiceProtocol.get_user_file_system_url_prefix(user_id=self.id)
        return AttachmentInfo(
            id=v.id,
            name=f'{url_prefix}/{v.name}',
        )
        
    class Config:
        from_attributes = True 
        