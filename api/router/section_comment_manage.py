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


def _build_comment_info(
    db_comment: models.section.SectionComment,
    *,
    liked: bool = False,
    reply_count: int = 0,
    preview_replies: list[schemas.section.SectionCommentInfo] | None = None,
) -> schemas.section.SectionCommentInfo:
    return schemas.section.SectionCommentInfo(
        id=db_comment.id,
        content=db_comment.content,
        create_time=db_comment.create_time,
        update_time=db_comment.update_time,
        creator=db_comment.creator,
        parent_id=db_comment.parent_id,
        root_id=db_comment.root_id,
        reply_user=db_comment.reply_user if db_comment.reply_user_id is not None else None,
        like_count=db_comment.like_count or 0,
        liked=liked,
        reply_count=reply_count,
        preview_replies=preview_replies or [],
    )


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

    parent_id = section_comment_create_request.parent_id
    root_id: int | None = None
    reply_user_id: int | None = None

    if parent_id is not None:
        db_parent = await crud.section.get_section_comment_by_id_async(
            db=db,
            comment_id=parent_id,
        )
        if db_parent is None or db_parent.section_id != section_comment_create_request.section_id:
            raise schemas.error.CustomException("Parent comment not found", code=404)
        # Flatten to two levels: root_id is parent's root_id if it has one, else parent.id
        root_id = db_parent.root_id if db_parent.root_id is not None else db_parent.id
        # If replying to a reply, capture the user being replied to
        if db_parent.root_id is not None:
            reply_user_id = db_parent.creator_id

    db_comment = await crud.section.create_section_comment_async(
        db=db,
        section_id=section_comment_create_request.section_id,
        creator_id=user.id,
        content=section_comment_create_request.content,
        parent_id=parent_id,
        root_id=root_id,
        reply_user_id=reply_user_id,
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
    sort = section_comment_search_request.sort if section_comment_search_request.sort in ("time", "hot") else "time"

    db_section_parent_degree_comments = await crud.section.search_parent_degree_section_comments_async(
        db=db,
        section_id=section_comment_search_request.section_id,
        keyword=section_comment_search_request.keyword,
        start=section_comment_search_request.start,
        limit=section_comment_search_request.limit,
        sort=sort,
    )
    total_parent = await crud.section.count_parent_degree_section_comments_async(
        db=db,
        section_id=section_comment_search_request.section_id,
        keyword=section_comment_search_request.keyword
    )

    has_more = False
    next_start: int | None = None
    if section_comment_search_request.limit > 0 and len(db_section_parent_degree_comments) == section_comment_search_request.limit:
        if sort == "hot":
            consumed = (section_comment_search_request.start or 0) + len(db_section_parent_degree_comments)
            has_more = consumed < total_parent
            next_start = consumed if has_more else None
        else:
            next_section_comment = await crud.section.search_next_parent_degree_section_comment_async(
                db=db,
                section_id=section_comment_search_request.section_id,
                section_comment=db_section_parent_degree_comments[-1],
                keyword=section_comment_search_request.keyword
            )
            has_more = next_section_comment is not None
            next_start = next_section_comment.id if next_section_comment is not None else None

    # Aggregate reply counts and preview replies for visible roots
    visible_ids = [c.id for c in db_section_parent_degree_comments]
    reply_counts = await crud.section.count_replies_for_root_ids_async(db=db, root_ids=visible_ids)
    preview_replies_map = await crud.section.get_preview_replies_for_root_ids_async(
        db=db,
        root_ids=visible_ids,
        per_root_limit=section_comment_search_request.preview_reply_limit,
    )

    # Aggregate liked-by-current-user across both top-level and preview replies
    user_id = user.id if user is not None else None
    all_ids: list[int] = list(visible_ids)
    for replies in preview_replies_map.values():
        for r in replies:
            all_ids.append(r.id)
    liked_set: set[int] = set()
    if user_id is not None and all_ids:
        liked_set = await crud.section.get_user_liked_comment_ids_async(
            db=db,
            user_id=user_id,
            comment_ids=all_ids,
        )

    elements: list[schemas.section.SectionCommentInfo] = []
    for db_comment in db_section_parent_degree_comments:
        preview_infos = [
            _build_comment_info(
                r,
                liked=r.id in liked_set,
            )
            for r in preview_replies_map.get(db_comment.id, [])
        ]
        elements.append(_build_comment_info(
            db_comment,
            liked=db_comment.id in liked_set,
            reply_count=reply_counts.get(db_comment.id, 0),
            preview_replies=preview_infos,
        ))

    return schemas.pagination.InifiniteScrollPagnition(
        total=total_parent,
        elements=elements,
        start=section_comment_search_request.start,
        limit=section_comment_search_request.limit,
        has_more=has_more,
        next_start=next_start
    )


@section_comment_manage_router.post('/comment/reply/search', response_model=schemas.pagination.InifiniteScrollPagnition[schemas.section.SectionCommentInfo])
async def search_section_comment_replies(
    request_data: schemas.section.SectionCommentReplySearchRequest,
    db: AsyncSession = Depends(get_async_db),
    user: models.user.User = Depends(get_current_user_without_throw),
):
    db_root = await crud.section.get_section_comment_by_id_async(
        db=db,
        comment_id=request_data.root_comment_id,
    )
    if db_root is None:
        raise schemas.error.CustomException("Comment not found", code=404)
    await _ensure_section_comment_access(
        db=db,
        section_id=db_root.section_id,
        user_id=user.id if user is not None else None,
    )

    db_replies = await crud.section.search_section_comment_replies_async(
        db=db,
        root_comment_id=request_data.root_comment_id,
        start=request_data.start,
        limit=request_data.limit + 1,
    )
    has_more = len(db_replies) > request_data.limit
    next_start: int | None = None
    if has_more:
        next_start = db_replies[request_data.limit].id
        db_replies = db_replies[:request_data.limit]

    total = await crud.section.count_section_comment_replies_async(
        db=db,
        root_comment_id=request_data.root_comment_id,
    )

    user_id = user.id if user is not None else None
    liked_set: set[int] = set()
    if user_id is not None and db_replies:
        liked_set = await crud.section.get_user_liked_comment_ids_async(
            db=db,
            user_id=user_id,
            comment_ids=[r.id for r in db_replies],
        )

    elements = [
        _build_comment_info(r, liked=r.id in liked_set)
        for r in db_replies
    ]

    return schemas.pagination.InifiniteScrollPagnition(
        total=total,
        elements=elements,
        start=request_data.start,
        limit=request_data.limit,
        has_more=has_more,
        next_start=next_start,
    )


@section_comment_manage_router.post('/comment/like', response_model=schemas.common.NormalResponse)
async def like_section_comment(
    request_data: schemas.section.SectionCommentLikeRequest,
    db: AsyncSession = Depends(get_async_db),
    user: models.user.User = Depends(get_current_user),
):
    db_comment = await crud.section.get_section_comment_by_id_async(
        db=db,
        comment_id=request_data.section_comment_id,
    )
    if db_comment is None:
        raise schemas.error.CustomException("Comment not found", code=404)
    await _ensure_section_comment_access(
        db=db,
        section_id=db_comment.section_id,
        user_id=user.id,
    )
    await crud.section.like_section_comment_async(
        db=db,
        comment_id=request_data.section_comment_id,
        user_id=user.id,
    )
    await db.commit()
    return schemas.common.SuccessResponse()


@section_comment_manage_router.post('/comment/unlike', response_model=schemas.common.NormalResponse)
async def unlike_section_comment(
    request_data: schemas.section.SectionCommentLikeRequest,
    db: AsyncSession = Depends(get_async_db),
    user: models.user.User = Depends(get_current_user),
):
    db_comment = await crud.section.get_section_comment_by_id_async(
        db=db,
        comment_id=request_data.section_comment_id,
    )
    if db_comment is None:
        raise schemas.error.CustomException("Comment not found", code=404)
    await _ensure_section_comment_access(
        db=db,
        section_id=db_comment.section_id,
        user_id=user.id,
    )
    await crud.section.unlike_section_comment_async(
        db=db,
        comment_id=request_data.section_comment_id,
        user_id=user.id,
    )
    await db.commit()
    return schemas.common.SuccessResponse()


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
    user_id = user.id if user is not None else None
    liked_set: set[int] = set()
    if user_id is not None:
        liked_set = await crud.section.get_user_liked_comment_ids_async(
            db=db,
            user_id=user_id,
            comment_ids=[db_comment.id],
        )
    reply_count = await crud.section.count_section_comment_replies_async(
        db=db,
        root_comment_id=db_comment.root_id if db_comment.root_id is not None else db_comment.id,
    ) if db_comment.parent_id is None else 0
    return _build_comment_info(
        db_comment,
        liked=db_comment.id in liked_set,
        reply_count=reply_count,
    )
