from __future__ import annotations

from datetime import datetime

from pydantic import Field

from enums.access_request import AccessRequestStatus, AccessRequestTargetType
from .base import BaseModel
from .user import UserPublicInfo


class AccessRequestCreateRequest(BaseModel):
    target_type: AccessRequestTargetType
    target_id: int
    message: str | None = Field(default=None, max_length=1000)


class AccessRequestListRequest(BaseModel):
    target_type: AccessRequestTargetType
    target_id: int
    status: AccessRequestStatus | None = None


class AccessRequestMineRequest(BaseModel):
    target_type: AccessRequestTargetType
    target_id: int


class AccessRequestHandleRequest(BaseModel):
    access_request_id: int
    approve: bool
    authority: int | None = Field(
        default=None,
        description="Authority assigned to the new member when approving. Required if approve is True.",
    )
    handle_message: str | None = Field(default=None, max_length=1000)


class AccessRequestCancelRequest(BaseModel):
    access_request_id: int


class AccessRequestInfo(BaseModel):
    id: int
    target_type: AccessRequestTargetType
    target_id: int
    applicant: UserPublicInfo
    message: str | None
    status: AccessRequestStatus
    granted_authority: int | None
    handler: UserPublicInfo | None
    handle_message: str | None
    create_time: datetime
    update_time: datetime | None


class AccessRequestListResponse(BaseModel):
    data: list[AccessRequestInfo]


class AccessRequestMineResponse(BaseModel):
    access_request: AccessRequestInfo | None
