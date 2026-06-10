from datetime import datetime, timezone
from uuid import uuid4

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

import crud
import models
import schemas
from common.dependencies import get_async_db, get_current_user
from common.encrypt import decrypt_share_access_key, encrypt_share_access_key
from common.resource_actions import resolve_publish_action

section_publish_manage_router = APIRouter()


@section_publish_manage_router.post('/publish', response_model=schemas.common.NormalResponse)
async def section_publish_request(
    section_publish_request: schemas.section.SectionPublishRequest,
    db: AsyncSession = Depends(get_async_db),
    user: models.user.User = Depends(get_current_user)
):
    db_section = await crud.section.get_section_by_section_id_async(
        db=db,
        section_id=section_publish_request.section_id
    )
    if db_section is None:
        raise schemas.error.CustomException("Section not found", code=404)
    if db_section.creator_id != user.id:
        raise schemas.error.CustomException("You are forbidden to publish this section", code=403)

    db_exist_publish_section = await crud.section.get_publish_section_by_section_id_async(
        db=db,
        section_id=section_publish_request.section_id
    )
    action = resolve_publish_action(
        status=section_publish_request.status,
        already_published=db_exist_publish_section is not None,
    )
    if action == "create":
        await crud.section.create_publish_section_async(
            db=db,
            section_id=section_publish_request.section_id
        )
    elif action == "delete":
        await crud.section.delete_published_section_by_section_id_async(
            db=db,
            section_id=section_publish_request.section_id
        )

    await db.commit()
    return schemas.common.SuccessResponse()

@section_publish_manage_router.post('/republish', response_model=schemas.common.NormalResponse)
async def section_republish(
    section_republish_request: schemas.section.SectionRePublishRequest,
    db: AsyncSession = Depends(get_async_db),
    user: models.user.User = Depends(get_current_user)
):
    now = datetime.now(timezone.utc)
    db_section = await crud.section.get_section_by_section_id_async(
        db=db,
        section_id=section_republish_request.section_id
    )
    if db_section is None:
        raise schemas.error.CustomException("Section not found", code=404)
    if db_section.creator_id != user.id:
        raise schemas.error.CustomException("You are forbidden to publish this section", code=403)

    db_publish_section = await crud.section.get_publish_section_by_section_id_async(
        db=db,
        section_id=section_republish_request.section_id
    )
    if db_publish_section is None:
        raise schemas.error.CustomException("Section not published yet", code=404)

    db_publish_section.uuid = uuid4().hex
    db_publish_section.update_time = now

    await db.commit()
    return schemas.common.SuccessResponse()

@section_publish_manage_router.post('/publish/get', response_model=schemas.section.SectionPublishGetResponse)
async def section_publish_get_request(
    section_publish_get_request: schemas.section.SectionPublishGetRequest,
    db: AsyncSession = Depends(get_async_db),
    user: models.user.User = Depends(get_current_user)
):
    db_section = await crud.section.get_section_by_section_id_async(
        db=db,
        section_id=section_publish_get_request.section_id
    )
    if db_section is None:
        raise schemas.error.CustomException("Section not found", code=404)
    if db_section.creator_id != user.id:
        raise schemas.error.CustomException("You are forbidden to get the publish info of this section", code=403)
    db_publish_section = await crud.section.get_publish_section_by_section_id_async(
        db=db,
        section_id=section_publish_get_request.section_id
    )
    if db_publish_section is None:
        return schemas.section.SectionPublishGetResponse(
            status=False,
            uuid=None,
            has_access_key=False,
            create_time=None,
            update_time=None
        )
    access_key = None
    if db_publish_section.access_key_encrypted is not None:
        access_key = decrypt_share_access_key(db_publish_section.access_key_encrypted)

    return schemas.section.SectionPublishGetResponse(
        status=True,
        uuid=db_publish_section.uuid,
        has_access_key=db_publish_section.access_key_encrypted is not None,
        access_key=access_key,
        update_time=db_publish_section.update_time,
        create_time=db_publish_section.create_time
    )


@section_publish_manage_router.post('/publish/access-key', response_model=schemas.common.NormalResponse)
async def update_section_publish_access_key(
    access_key_update_request: schemas.section.SectionAccessKeyUpdateRequest,
    db: AsyncSession = Depends(get_async_db),
    user: models.user.User = Depends(get_current_user),
):
    db_section = await crud.section.get_section_by_section_id_async(
        db=db,
        section_id=access_key_update_request.section_id,
    )
    if db_section is None:
        raise schemas.error.CustomException("Section not found", code=404)
    if db_section.creator_id != user.id:
        raise schemas.error.CustomException("You are forbidden to manage the access key of this section", code=403)

    db_publish_section = await crud.section.get_publish_section_by_section_id_async(
        db=db,
        section_id=access_key_update_request.section_id,
    )
    if db_publish_section is None:
        raise schemas.error.CustomException("Section is not published", code=400)

    normalized_key = (access_key_update_request.access_key or "").strip()
    db_publish_section.access_key_encrypted = encrypt_share_access_key(normalized_key) if normalized_key else None
    db_publish_section.update_time = datetime.now(timezone.utc)

    await db.commit()
    return schemas.common.SuccessResponse()
