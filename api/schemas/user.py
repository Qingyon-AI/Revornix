from datetime import datetime, timezone

from pydantic import BaseModel, field_serializer, field_validator

from protocol.remote_file_service import RemoteFileServiceProtocol


class BindEmailRequest(BaseModel):
    email: str

class BindEmailCodeVerifyRequest(BaseModel):
    email: str
    code: str

class SearchUserRequest(BaseModel):
    filter_name: str
    filter_value: str
    start: int | None = None
    limit: int = 10
    @field_validator('filter_name')
    def validate_filter_name(cls, v: str):
        if v not in ['nickname', 'email', 'uuid']:
            raise ValueError('filter_name must be name or email')
        return v

class WeChatInfo(BaseModel):
    wechat_open_id: str
    nickname: str | None
    platform: int

class WeChatWebUserBindRequest(BaseModel):
    code: str

class WeChatMiniUserCreateRequest(BaseModel):
    code: str

class WeChatWebUserCreateRequest(BaseModel):
    code: str

class SmsUserCodeCreateRequest(BaseModel):
    phone: str

class SmsUserCodeVerifyCreate(BaseModel):
    phone: str
    code: str

class BindPhoneCodeCreateRequest(BaseModel):
    phone: str

class BindPhoneCodeVerifyRequest(BaseModel):
    phone: str
    code: str

class PhoneInfo(BaseModel):
    phone: str

class GoogleUserCreate(BaseModel):
    code: str

class GoogleUserBind(BaseModel):
    code: str

class GithubUserCreate(BaseModel):
    code: str

class GithubUserBind(BaseModel):
    code: str

class GoogleInfo(BaseModel):
    google_user_id: str

class GithubInfo(BaseModel):
    github_user_id: str

class DefaultFileSystemUpdateRequest(BaseModel):
    default_user_file_system: int | None = None

class DefaultReadMarkReasonUpdateRequest(BaseModel):
    default_read_mark_reason: int

class DefaultEngineUpdateRequest(BaseModel):
    default_website_document_parse_user_engine_id: int | None = None
    default_file_document_parse_user_engine_id: int | None = None
    default_podcast_user_engine_id: int | None = None
    default_image_generate_engine_id: int | None = None

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

class EmailUserCreateCodeVerifyRequest(BaseModel):
    email: str
    code: str
    password: str

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
    slogan: str | None = None
    avatar: str | None = None

class UserLoginRequest(BaseModel):
    email: str
    password: str

class InitialPasswordResponse(BaseModel):
    password: str

class EmailInfo(BaseModel):
    email: str
    is_initial_password: bool
    has_seen_initial_password: bool | None

class PrivateUserInfo(BaseModel):
    id: int
    uuid: str
    fans: int | None = None
    follows: int | None = None
    avatar: str | None = None
    nickname: str | None = None
    slogan: str | None = None
    phone_info: PhoneInfo | None = None
    email_info: EmailInfo | None = None
    github_info: GithubInfo | None = None
    google_info: GoogleInfo | None = None
    wechat_infos: list[WeChatInfo] | None = None
    default_user_file_system: int | None = None
    default_read_mark_reason: int | None = None
    default_document_reader_model_id: int | None = None
    default_revornix_model_id: int | None = None
    default_website_document_parse_user_engine_id: int | None = None
    default_file_document_parse_user_engine_id: int | None = None
    default_podcast_user_engine_id: int | None = None
    default_image_generate_engine_id: int | None = None

    @field_serializer("avatar")
    def serialize_avatar(self, v: str) -> str:
        url_prefix = RemoteFileServiceProtocol.get_user_file_system_url_prefix(
            user_id=self.id
        )
        return f'{url_prefix}/{v}'

    class Config:
        from_attributes = True

class UserInfoRequest(BaseModel):
    user_id: int

class SectionUserPublicInfo(BaseModel):
    id: int
    nickname: str | None = None
    avatar: str | None = None
    slogan: str | None = None
    authority: int | None = None
    role: int | None = None
    create_time: datetime
    update_time: datetime | None
    @field_serializer("create_time")
    def serializer_create_time(self, v: datetime):
        if v.tzinfo is None:
            return v.replace(tzinfo=timezone.utc)
        return v
    @field_serializer("update_time")
    def serializer_update_time(self, v: datetime | None):
        if v is None:
            return v
        if v.tzinfo is None:
            return v.replace(tzinfo=timezone.utc)
        return v
    @field_serializer("avatar")
    def serialize_avatar(self, v: str) -> str:
        url_prefix = RemoteFileServiceProtocol.get_user_file_system_url_prefix(
            user_id=self.id
        )
        return f'{url_prefix}/{v}'
    class Config:
        from_attributes = True

class UserPublicInfo(BaseModel):
    id: int
    nickname: str | None = None
    avatar: str | None = None
    slogan: str | None = None
    is_followed: bool | None = None
    fans: int | None = None
    follows: int | None = None
    @field_serializer("avatar")
    def serialize_avatar(self, v: str) -> str:
        url_prefix = RemoteFileServiceProtocol.get_user_file_system_url_prefix(
            user_id=self.id
        )
        return f'{url_prefix}/{v}'
    class Config:
        from_attributes = True
