import asyncio

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

import crud
import models
import schemas
from common.celery.app import start_trigger_user_notification_event
from common.dependencies import (
    get_async_db,
    get_current_user,
    get_current_user_without_throw,
)
from enums.notification import NotificationTriggerEventUUID
from enums.section import UserSectionRole
from router.logic_helpers import ensure_private_section_access
section_comment_manage_router = APIRouter()


async def _ensure_section_comment_access(
    *,
    db: AsyncSession,
    section_id: int,
    user_id: int | None,
):
    db_section = await crud.section.get_section_by_section_id_async(
        db=db,
        section_id=section_id,
    )
    if db_section is None:
        raise schemas.error.CustomException("Section not found", code=404)

    db_publish_section = await crud.section.get_publish_section_by_section_id_async(
        db=db,
        section_id=section_id,
    )
    if db_publish_section is None:
        db_users = await crud.section.get_users_for_section_by_section_id_async(
            db=db,
            section_id=section_id,
            filter_roles=[UserSectionRole.MEMBER, UserSectionRole.CREATOR],
        )
        ensure_private_section_access(
            user_id=user_id,
            member_user_ids=[db_user.id for db_user in db_users],
        )

    return db_section

@section_comment_manage_router.post('/comment/create', response_model=schemas.common.NormalResponse)
async def create_section_comment(
    section_comment_create_request: schemas.section.SectionCommentCreateRequest,
    db: AsyncSession = Depends(get_async_db),
    user: models.user.User = Depends(get_current_user),
):
    await _ensure_section_comment_access(
        db=db,
        section_id=section_comment_create_request.section_id,
        user_id=user.id,
    )

    db_comment = await crud.section.create_section_comment_async(
        db=db,
        section_id=section_comment_create_request.section_id,
        creator_id=user.id,
        content=section_comment_create_request.content
    )
    await db.commit()
    db_users = await crud.section.get_users_for_section_by_section_id_async(
        db=db,
        section_id=section_comment_create_request.section_id,
        filter_roles=[UserSectionRole.MEMBER, UserSectionRole.CREATOR]
    )
    await asyncio.gather(*[
        asyncio.to_thread(
            start_trigger_user_notification_event.delay,
            user_id=db_user.id,
            trigger_event_uuid=NotificationTriggerEventUUID.SECTION_COMMENTED.value,
            params={
                "section_id": section_comment_create_request.section_id,
                "receiver_id": db_user.id,
                "comment_id": db_comment.id,
            },
        )
        for db_user in db_users
    ])
    return schemas.common.SuccessResponse()

@section_comment_manage_router.post('/comment/search', response_model=schemas.pagination.InifiniteScrollPagnition[schemas.section.SectionCommentInfo])
async def search_section_comment(
    section_comment_search_request: schemas.section.SectionCommentSearchRequest,
    db: AsyncSession = Depends(get_async_db),
    user: models.user.User = Depends(get_current_user_without_throw),
):
    await _ensure_section_comment_access(
        db=db,
        section_id=section_comment_search_request.section_id,
        user_id=user.id if user is not None else None,
    )
    has_more = False
    next_start = None
    db_section_parent_degree_comments = await crud.section.search_parent_degree_section_comments_async(
        db=db,
        section_id=section_comment_search_request.section_id,
        keyword=section_comment_search_request.keyword,
        start=section_comment_search_request.start,
        limit=section_comment_search_request.limit
    )
    total_parent = await crud.section.count_parent_degree_section_comments_async(
        db=db,
        section_id=section_comment_search_request.section_id,
        keyword=section_comment_search_request.keyword
    )
    if section_comment_search_request.limit > 0 and len(db_section_parent_degree_comments) == section_comment_search_request.limit:
        next_section_comment = await crud.section.search_next_parent_degree_section_comment_async(
            db=db,
            section_id=section_comment_search_request.section_id,
            section_comment=db_section_parent_degree_comments[-1],
            keyword=section_comment_search_request.keyword
        )
        has_more = next_section_comment is not None
        next_start = next_section_comment.id if next_section_comment is not None else None
    section_parent_degree_comments = [
        schemas.section.SectionCommentInfo.model_validate(db_section_parent_degree_comment) for db_section_parent_degree_comment in db_section_parent_degree_comments
    ]
    return schemas.pagination.InifiniteScrollPagnition(
        total=total_parent,
        elements=section_parent_degree_comments,
        start=section_comment_search_request.start,
        limit=section_comment_search_request.limit,
        has_more=has_more,
        next_start=next_start
    )

@section_comment_manage_router.post('/comment/delete', response_model=schemas.common.NormalResponse)
async def delete_section_comment(
    section_comment_delete_request: schemas.section.SectionCommentDeleteRequest,
    db: AsyncSession = Depends(get_async_db),
    user: models.user.User = Depends(get_current_user),
):
    await crud.section.delete_section_comments_by_section_comment_ids_async(
        db=db,
        user_id=user.id,
        section_comment_ids=section_comment_delete_request.section_comment_ids
    )
    await db.commit()

    return schemas.common.SuccessResponse()

@section_comment_manage_router.post('/comment/detail', response_model=schemas.section.SectionCommentInfo)
async def get_section_comment_detail(
    section_comment_detail_request: schemas.section.SectionCommentDetailRequest,
    db: AsyncSession = Depends(get_async_db),
    user: models.user.User = Depends(get_current_user_without_throw),
):
    db_comment = await crud.section.get_section_comment_by_id_async(
        db=db,
        comment_id=section_comment_detail_request.section_comment_id,
    )
    if db_comment is None:
        raise schemas.error.CustomException("Comment not found", code=404)
    await _ensure_section_comment_access(
        db=db,
        section_id=db_comment.section_id,
        user_id=user.id if user is not None else None,
    )
    return schemas.section.SectionCommentInfo.model_validate(db_comment)
