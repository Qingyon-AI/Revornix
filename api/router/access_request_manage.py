import asyncio
from datetime import datetime, timezone
from typing import Iterable

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

import crud
import models
import schemas
from common.celery.app import start_trigger_user_notification_event
from common.dependencies import get_async_db, get_current_user
from enums.access_request import AccessRequestStatus, AccessRequestTargetType
from enums.document import UserDocumentAuthority
from enums.notification import NotificationTriggerEventUUID
from enums.section import UserSectionAuthority, UserSectionRole
from common.access_control import has_document_full_access, has_section_full_access

access_request_manage_router = APIRouter()


async def _ensure_section_target(
    db: AsyncSession,
    section_id: int,
) -> models.section.Section:
    db_section = await crud.section.get_section_by_section_id_async(
        db=db,
        section_id=section_id,
    )
    if db_section is None:
        raise schemas.error.CustomException("Section not found", code=404)
    return db_section


async def _ensure_document_target(
    db: AsyncSession,
    document_id: int,
) -> models.document.Document:
    db_document = await crud.document.get_document_by_document_id_async(
        db=db,
        document_id=document_id,
    )
    if db_document is None:
        raise schemas.error.CustomException("Document not found", code=404)
    return db_document


async def _has_section_access_management(
    db: AsyncSession,
    section_id: int,
    user_id: int,
) -> bool:
    db_user_section = await crud.section.get_section_user_by_section_id_and_user_id_async(
        db=db,
        section_id=section_id,
        user_id=user_id,
    )
    return has_section_full_access(db_user_section)


async def _has_document_access_management(
    db: AsyncSession,
    db_document: models.document.Document,
    user_id: int,
) -> bool:
    db_user_document = await crud.document.get_user_document_by_user_id_and_document_id_async(
        db=db,
        user_id=user_id,
        document_id=db_document.id,
    )
    return has_document_full_access(
        document=db_document,
        user_id=user_id,
        user_document=db_user_document,
    )


def _build_user_public_info(db_user: models.user.User | None) -> schemas.user.UserPublicInfo | None:
    if db_user is None:
        return None
    return schemas.user.UserPublicInfo.model_validate(db_user)


async def _build_access_request_info(
    db: AsyncSession,
    db_request: models.access_request.AccessRequest,
) -> schemas.access_request.AccessRequestInfo:
    db_applicant = await crud.user.get_user_by_id_async(db=db, user_id=db_request.applicant_id)
    db_handler = None
    if db_request.handled_by is not None:
        db_handler = await crud.user.get_user_by_id_async(db=db, user_id=db_request.handled_by)
    if db_applicant is None:
        raise schemas.error.CustomException("Applicant not found", code=404)
    return schemas.access_request.AccessRequestInfo(
        id=db_request.id,
        target_type=AccessRequestTargetType(db_request.target_type),
        target_id=db_request.target_id,
        applicant=schemas.user.UserPublicInfo.model_validate(db_applicant),
        message=db_request.message,
        status=AccessRequestStatus(db_request.status),
        granted_authority=db_request.granted_authority,
        handler=_build_user_public_info(db_handler),
        handle_message=db_request.handle_message,
        create_time=db_request.create_time,
        update_time=db_request.update_time,
    )


async def _fan_out_notification(
    *,
    receiver_ids: Iterable[int],
    trigger_event_uuid: str,
    base_params: dict,
) -> None:
    await asyncio.gather(*[
        asyncio.to_thread(
            start_trigger_user_notification_event.delay,
            user_id=receiver_id,
            trigger_event_uuid=trigger_event_uuid,
            params={**base_params, "receiver_id": receiver_id},
        )
        for receiver_id in receiver_ids
    ])


@access_request_manage_router.post('/create', response_model=schemas.access_request.AccessRequestInfo)
async def create_access_request(
    request: schemas.access_request.AccessRequestCreateRequest,
    db: AsyncSession = Depends(get_async_db),
    user: models.user.User = Depends(get_current_user),
):
    target_type = AccessRequestTargetType(request.target_type)
    if target_type == AccessRequestTargetType.SECTION:
        db_section = await _ensure_section_target(db, request.target_id)
        if db_section.creator_id == user.id:
            raise schemas.error.CustomException("You are the creator of this section", code=400)
        db_user_section = await crud.section.get_section_user_by_section_id_and_user_id_async(
            db=db,
            section_id=request.target_id,
            user_id=user.id,
        )
        if db_user_section is not None and db_user_section.role in (
            UserSectionRole.CREATOR.value,
            UserSectionRole.MEMBER.value,
        ):
            raise schemas.error.CustomException("You are already a member of this section", code=409)
    else:
        db_document = await _ensure_document_target(db, request.target_id)
        if db_document.creator_id == user.id:
            raise schemas.error.CustomException("You are the creator of this document", code=400)
        db_user_document = await crud.document.get_user_document_by_user_id_and_document_id_async(
            db=db,
            user_id=user.id,
            document_id=request.target_id,
        )
        if db_user_document is not None:
            raise schemas.error.CustomException("You are already a collaborator of this document", code=409)

    db_existing = await crud.access_request.get_pending_access_request_async(
        db=db,
        target_type=target_type.value,
        target_id=request.target_id,
        applicant_id=user.id,
    )
    if db_existing is not None:
        raise schemas.error.CustomException("You already have a pending request", code=409)

    db_request = await crud.access_request.create_access_request_async(
        db=db,
        target_type=target_type.value,
        target_id=request.target_id,
        applicant_id=user.id,
        message=request.message,
    )
    await db.commit()
    await db.refresh(db_request)

    if target_type == AccessRequestTargetType.SECTION:
        db_admin_users = await crud.section.get_users_for_section_by_section_id_async(
            db=db,
            section_id=request.target_id,
            filter_roles=[UserSectionRole.CREATOR, UserSectionRole.MEMBER],
        )
        await _fan_out_notification(
            receiver_ids=[u.id for u in db_admin_users],
            trigger_event_uuid=NotificationTriggerEventUUID.SECTION_JOIN_REQUESTED.value,
            base_params={
                "section_id": request.target_id,
                "applicant_id": user.id,
                "access_request_id": db_request.id,
                "message": request.message,
            },
        )
    else:
        db_doc = await _ensure_document_target(db, request.target_id)
        await _fan_out_notification(
            receiver_ids=[db_doc.creator_id],
            trigger_event_uuid=NotificationTriggerEventUUID.DOCUMENT_JOIN_REQUESTED.value,
            base_params={
                "document_id": request.target_id,
                "applicant_id": user.id,
                "access_request_id": db_request.id,
                "message": request.message,
            },
        )

    return await _build_access_request_info(db, db_request)


@access_request_manage_router.post('/list', response_model=schemas.access_request.AccessRequestListResponse)
async def list_access_requests(
    request: schemas.access_request.AccessRequestListRequest,
    db: AsyncSession = Depends(get_async_db),
    user: models.user.User = Depends(get_current_user),
):
    target_type = AccessRequestTargetType(request.target_type)
    if target_type == AccessRequestTargetType.SECTION:
        await _ensure_section_target(db, request.target_id)
        if not await _has_section_access_management(db, request.target_id, user.id):
            raise schemas.error.CustomException(
                "You don't have permission to view join requests for this section",
                code=403,
            )
    else:
        db_document = await _ensure_document_target(db, request.target_id)
        if not await _has_document_access_management(db, db_document, user.id):
            raise schemas.error.CustomException(
                "You don't have permission to view join requests for this document",
                code=403,
            )

    status_value = request.status.value if request.status is not None else None
    db_requests = await crud.access_request.list_access_requests_by_target_async(
        db=db,
        target_type=target_type.value,
        target_id=request.target_id,
        status=status_value,
    )
    items = [await _build_access_request_info(db, r) for r in db_requests]
    return schemas.access_request.AccessRequestListResponse(data=items)


@access_request_manage_router.post('/mine', response_model=schemas.access_request.AccessRequestMineResponse)
async def get_my_access_request(
    request: schemas.access_request.AccessRequestMineRequest,
    db: AsyncSession = Depends(get_async_db),
    user: models.user.User = Depends(get_current_user),
):
    target_type = AccessRequestTargetType(request.target_type)
    db_request = await crud.access_request.get_pending_access_request_async(
        db=db,
        target_type=target_type.value,
        target_id=request.target_id,
        applicant_id=user.id,
    )
    info = await _build_access_request_info(db, db_request) if db_request is not None else None
    return schemas.access_request.AccessRequestMineResponse(access_request=info)


@access_request_manage_router.post('/handle', response_model=schemas.access_request.AccessRequestInfo)
async def handle_access_request(
    request: schemas.access_request.AccessRequestHandleRequest,
    db: AsyncSession = Depends(get_async_db),
    user: models.user.User = Depends(get_current_user),
):
    db_request = await crud.access_request.get_access_request_by_id_async(
        db=db,
        access_request_id=request.access_request_id,
    )
    if db_request is None:
        raise schemas.error.CustomException("Access request not found", code=404)
    if db_request.status != AccessRequestStatus.PENDING.value:
        raise schemas.error.CustomException("This request has already been handled", code=409)

    target_type = AccessRequestTargetType(db_request.target_type)
    target_id = db_request.target_id
    applicant_id = db_request.applicant_id

    if target_type == AccessRequestTargetType.SECTION:
        await _ensure_section_target(db, target_id)
        if not await _has_section_access_management(db, target_id, user.id):
            raise schemas.error.CustomException(
                "You don't have permission to handle join requests for this section",
                code=403,
            )
    else:
        db_document = await _ensure_document_target(db, target_id)
        if not await _has_document_access_management(db, db_document, user.id):
            raise schemas.error.CustomException(
                "You don't have permission to handle join requests for this document",
                code=403,
            )

    if request.approve:
        if request.authority is None:
            raise schemas.error.CustomException(
                "Authority is required when approving an access request",
                code=400,
            )
        if target_type == AccessRequestTargetType.SECTION:
            try:
                authority_enum = UserSectionAuthority(request.authority)
            except ValueError:
                raise schemas.error.CustomException("Invalid section authority", code=400)
            db_existing = await crud.section.get_section_user_by_section_id_and_user_id_async(
                db=db,
                section_id=target_id,
                user_id=applicant_id,
            )
            if db_existing is None:
                await crud.section.create_section_user_async(
                    db=db,
                    section_id=target_id,
                    user_id=applicant_id,
                    role=UserSectionRole.MEMBER,
                    authority=authority_enum,
                    managed_by=user.id,
                )
            else:
                db_existing.role = UserSectionRole.MEMBER.value
                db_existing.authority = authority_enum.value
                db_existing.managed_by = user.id
                db_existing.update_time = datetime.now(timezone.utc)
        else:
            try:
                authority_enum = UserDocumentAuthority(request.authority)
            except ValueError:
                raise schemas.error.CustomException("Invalid document authority", code=400)
            db_existing = await crud.document.get_user_document_by_user_id_and_document_id_async(
                db=db,
                user_id=applicant_id,
                document_id=target_id,
            )
            if db_existing is None:
                await crud.document.create_user_document_async(
                    db=db,
                    user_id=applicant_id,
                    document_id=target_id,
                    authority=authority_enum,
                    managed_by=user.id,
                )
            else:
                db_existing.authority = authority_enum.value
                db_existing.managed_by = user.id
                db_existing.update_time = datetime.now(timezone.utc)

    now = datetime.now(timezone.utc)
    db_request.status = (
        AccessRequestStatus.APPROVED.value if request.approve else AccessRequestStatus.REJECTED.value
    )
    db_request.granted_authority = request.authority if request.approve else None
    db_request.handled_by = user.id
    db_request.handle_message = request.handle_message
    db_request.update_time = now

    await db.commit()
    await db.refresh(db_request)

    if target_type == AccessRequestTargetType.SECTION:
        trigger_uuid = NotificationTriggerEventUUID.SECTION_JOIN_REQUEST_HANDLED.value
        base_params = {
            "section_id": target_id,
            "approved": request.approve,
            "handle_message": request.handle_message,
        }
    else:
        trigger_uuid = NotificationTriggerEventUUID.DOCUMENT_JOIN_REQUEST_HANDLED.value
        base_params = {
            "document_id": target_id,
            "approved": request.approve,
            "handle_message": request.handle_message,
        }
    await _fan_out_notification(
        receiver_ids=[applicant_id],
        trigger_event_uuid=trigger_uuid,
        base_params=base_params,
    )

    return await _build_access_request_info(db, db_request)


@access_request_manage_router.post('/cancel', response_model=schemas.common.NormalResponse)
async def cancel_access_request(
    request: schemas.access_request.AccessRequestCancelRequest,
    db: AsyncSession = Depends(get_async_db),
    user: models.user.User = Depends(get_current_user),
):
    db_request = await crud.access_request.get_access_request_by_id_async(
        db=db,
        access_request_id=request.access_request_id,
    )
    if db_request is None:
        raise schemas.error.CustomException("Access request not found", code=404)
    if db_request.applicant_id != user.id:
        raise schemas.error.CustomException("You can only cancel your own request", code=403)
    if db_request.status != AccessRequestStatus.PENDING.value:
        raise schemas.error.CustomException("This request can no longer be cancelled", code=409)

    db_request.status = AccessRequestStatus.CANCELLED.value
    db_request.update_time = datetime.now(timezone.utc)
    await db.commit()
    return schemas.common.SuccessResponse()
