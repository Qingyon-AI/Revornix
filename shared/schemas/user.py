from datetime import datetime

from pydantic import Field, field_validator

from enums.section import UserSectionAuthority

from .base import BaseModel

PUBLIC_PAGINATION_LIMIT = 20


class BindEmailRequest(BaseModel):
    email: str

class BindEmailCodeVerifyRequest(BaseModel):
    email: str
    code: str

class SearchUserRequest(BaseModel):
    filter_name: str
    filter_value: str
    start: int | None = None
    limit: int = Field(default=10, le=PUBLIC_PAGINATION_LIMIT)
    @field_validator('filter_name')
    def validate_filter_name(cls, v: str):
        if v not in ['nickname', 'email', 'uuid']:
            raise ValueError('filter_name must be name or email')
        return v

class SearchPublicUsersRequest(BaseModel):
    start: int | None = None
    limit: int = Field(default=10, le=PUBLIC_PAGINATION_LIMIT)
    keyword: str | None = None

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

class WeChatOfficialQrCreateResponse(BaseModel):
    scene_str: str
    ticket: str
    image_url: str
    expires_in: int

class WeChatOfficialQrStatusRequest(BaseModel):
    scene_str: str

class WeChatOfficialQrStatusResponse(BaseModel):
    status: str  # pending | confirmed | expired
    access_token: str | None = None
    refresh_token: str | None = None
    expires_in: int | None = None
    mfa_required: bool = False
    challenge_id: str | None = None
    methods: list[str] = []

class WeChatOfficialBindQrCreateResponse(BaseModel):
    scene_str: str
    ticket: str
    image_url: str
    expires_in: int

class WeChatOfficialBindQrStatusRequest(BaseModel):
    scene_str: str

class WeChatOfficialBindQrStatusResponse(BaseModel):
    # pending: not yet scanned
    # confirmed: scanned and bound successfully
    # conflict: scanned but the WeChat account is already attached elsewhere
    # expired: scene expired or unknown
    status: str
    message: str | None = None

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
    redirect_uri: str | None = None

class GoogleUserBind(BaseModel):
    code: str
    redirect_uri: str | None = None

class GithubUserCreate(BaseModel):
    code: str
    redirect_uri: str | None = None

class GithubUserBind(BaseModel):
    code: str
    redirect_uri: str | None = None

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
    default_audio_transcribe_engine_id: int | None = None
    default_audio_meeting_mode: bool | None = None

class DefaultModelUpdateRequest(BaseModel):
    default_document_reader_model_id: int | None = None
    default_revornix_model_id: int | None = None
    default_ai_interaction_language: int | None = None

class MfaStatusUpdateRequest(BaseModel):
    enabled: bool

class DailyReportStatusChangeRequest(BaseModel):
    status: bool
    run_time: str | None = None # "00:00:00" 格式

class BindEmailVerifyRequest(BaseModel):
    email: str

class SearchUserFansRequest(BaseModel):
    user_id: int
    start: int | None = None
    limit: int = Field(default=10, le=PUBLIC_PAGINATION_LIMIT)
    keyword: str | None = None

class SearchUserFollowsRequest(BaseModel):
    user_id: int
    start: int | None = None
    limit: int = Field(default=10, le=PUBLIC_PAGINATION_LIMIT)
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

class AuthResponse(BaseModel):
    access_token: str | None = None
    refresh_token: str | None = None
    expires_in: int | None = None
    mfa_required: bool = False
    challenge_id: str | None = None
    methods: list[str] = []

class PasswordUpdateRequest(BaseModel):
    origin_password: str
    new_password: str

class UserInfoUpdateRequest(BaseModel):
    nickname: str | None = None
    slogan: str | None = None
    avatar: str | None = None
    cover: str | None = None

class UserLoginRequest(BaseModel):
    email: str
    password: str

class InitialPasswordResponse(BaseModel):
    password: str

class EmailInfo(BaseModel):
    email: str
    is_initial_password: bool
    has_seen_initial_password: bool | None

class PasskeyInfo(BaseModel):
    id: int
    rp_id: str | None = None
    name: str | None = None
    device_type: str | None = None
    backed_up: bool = False
    last_used_at: datetime | None = None
    create_time: datetime

class TotpInfo(BaseModel):
    enabled: bool
    name: str | None = None
    last_used_at: datetime | None = None
    create_time: datetime | None = None

class PrivateUserInfo(BaseModel):
    id: int
    uuid: str
    role: int
    avatar: str
    cover: str | None = None
    nickname: str
    fans: int | None = None
    follows: int | None = None
    slogan: str | None = None
    phone_info: PhoneInfo | None = None
    email_info: EmailInfo | None = None
    github_info: GithubInfo | None = None
    google_info: GoogleInfo | None = None
    wechat_infos: list[WeChatInfo] | None = None
    mfa_enabled: bool = False
    passkeys: list[PasskeyInfo] | None = None
    totp: TotpInfo | None = None
    default_user_file_system: int | None = None
    default_read_mark_reason: int | None = None
    default_document_reader_model_id: int | None = None
    default_revornix_model_id: int | None = None
    default_website_document_parse_user_engine_id: int | None = None
    default_file_document_parse_user_engine_id: int | None = None
    default_podcast_user_engine_id: int | None = None
    default_audio_transcribe_engine_id: int | None = None
    default_audio_meeting_mode: bool | None = None
    default_image_generate_engine_id: int | None = None
    default_ai_interaction_language: int | None = None

class UserInfoRequest(BaseModel):
    user_id: int

class SectionUserPublicInfo(BaseModel):
    id: int
    avatar: str
    cover: str | None = None
    nickname: str
    slogan: str | None = None
    authority: UserSectionAuthority | None = None
    role: int | None = None
    managed_by: int | None = None
    create_time: datetime
    update_time: datetime | None

class UserPublicInfo(BaseModel):
    id: int
    role: int
    avatar: str
    cover: str | None = None
    nickname: str
    slogan: str | None = None
    is_followed: bool | None = None
    fans: int | None = None
    follows: int | None = None

class PasskeyRegistrationOptionsResponse(BaseModel):
    challenge_id: str
    options: dict

class PasskeyRegistrationVerifyRequest(BaseModel):
    challenge_id: str
    credential: dict
    name: str | None = None

class PasskeyAuthenticationOptionsRequest(BaseModel):
    challenge_id: str

class PasskeyAuthenticationOptionsResponse(BaseModel):
    challenge_id: str
    options: dict

class PasskeyAuthenticationVerifyRequest(BaseModel):
    challenge_id: str
    credential: dict

class PasskeyDeleteRequest(BaseModel):
    credential_id: int

class TotpRegistrationOptionsResponse(BaseModel):
    challenge_id: str
    secret: str
    otpauth_uri: str

class TotpRegistrationVerifyRequest(BaseModel):
    challenge_id: str
    code: str
    name: str | None = None

class TotpAuthenticationVerifyRequest(BaseModel):
    challenge_id: str
    code: str
