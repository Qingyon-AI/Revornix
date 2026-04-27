from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

import crud
import models
import schemas
from common.dependencies import (
    get_async_db,
    get_current_user,
    get_current_user_without_throw,
)
from router.logic_helpers import ensure_document_access

document_comment_manage_router = APIRouter()


async def _ensure_document_comment_access(
    *,
    db: AsyncSession,
    document_id: int,
    user_id: int | None,
) -> models.document.Document:
    """Mirror of section access: allow if document is published OR caller is creator/collaborator."""
    db_document = await crud.document.get_document_by_document_id_async(
        db=db,
        document_id=document_id,
    )
    if db_document is None:
        raise schemas.error.CustomException("Document not found", code=404)

    if user_id is not None and db_document.creator_id == user_id:
        return db_document

    db_published_document = await crud.document.get_publish_document_by_document_id_async(
        db=db,
        document_id=document_id,
    )
    if db_published_document is not None:
        return db_document

    has_collaborator = False
    if user_id is not None:
        db_user_document = await crud.document.get_user_document_by_user_id_and_document_id_async(
            db=db,
            user_id=user_id,
            document_id=document_id,
        )
        has_collaborator = db_user_document is not None

    ensure_document_access(
        is_creator=False,
        has_public_document=False,
        has_document_collaborator=has_collaborator,
    )
    return db_document


def _build_comment_info(
    db_comment: models.document.DocumentComment,
    *,
    liked: bool = False,
    reply_count: int = 0,
    preview_replies: list[schemas.document.DocumentCommentInfo] | None = None,
) -> schemas.document.DocumentCommentInfo:
    return schemas.document.DocumentCommentInfo(
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


@document_comment_manage_router.post('/comment/create', response_model=schemas.common.NormalResponse)
async def create_document_comment(
    request_data: schemas.document.DocumentCommentCreateRequest,
    db: AsyncSession = Depends(get_async_db),
    user: models.user.User = Depends(get_current_user),
):
    await _ensure_document_comment_access(
        db=db,
        document_id=request_data.document_id,
        user_id=user.id,
    )

    parent_id = request_data.parent_id
    root_id: int | None = None
    reply_user_id: int | None = None

    if parent_id is not None:
        db_parent = await crud.document.get_document_comment_by_id_async(
            db=db,
            comment_id=parent_id,
        )
        if db_parent is None or db_parent.document_id != request_data.document_id:
            raise schemas.error.CustomException("Parent comment not found", code=404)
        root_id = db_parent.root_id if db_parent.root_id is not None else db_parent.id
        if db_parent.root_id is not None:
            reply_user_id = db_parent.creator_id

    await crud.document.create_document_comment_async(
        db=db,
        document_id=request_data.document_id,
        creator_id=user.id,
        content=request_data.content,
        parent_id=parent_id,
        root_id=root_id,
        reply_user_id=reply_user_id,
    )
    await db.commit()
    return schemas.common.SuccessResponse()


@document_comment_manage_router.post('/comment/search', response_model=schemas.pagination.InifiniteScrollPagnition[schemas.document.DocumentCommentInfo])
async def search_document_comment(
    request_data: schemas.document.DocumentCommentSearchRequest,
    db: AsyncSession = Depends(get_async_db),
    user: models.user.User = Depends(get_current_user_without_throw),
):
    await _ensure_document_comment_access(
        db=db,
        document_id=request_data.document_id,
        user_id=user.id if user is not None else None,
    )
    sort = request_data.sort if request_data.sort in ("time", "hot") else "time"

    db_comments = await crud.document.search_parent_degree_document_comments_async(
        db=db,
        document_id=request_data.document_id,
        keyword=request_data.keyword,
        start=request_data.start,
        limit=request_data.limit,
        sort=sort,
    )
    total_parent = await crud.document.count_parent_degree_document_comments_async(
        db=db,
        document_id=request_data.document_id,
        keyword=request_data.keyword,
    )

    has_more = False
    next_start: int | None = None
    if request_data.limit > 0 and len(db_comments) == request_data.limit:
        if sort == "hot":
            consumed = (request_data.start or 0) + len(db_comments)
            has_more = consumed < total_parent
            next_start = consumed if has_more else None
        else:
            next_comment = await crud.document.search_next_parent_degree_document_comment_async(
                db=db,
                document_id=request_data.document_id,
                document_comment=db_comments[-1],
                keyword=request_data.keyword,
            )
            has_more = next_comment is not None
            next_start = next_comment.id if next_comment is not None else None

    visible_ids = [c.id for c in db_comments]
    reply_counts = await crud.document.count_document_replies_for_root_ids_async(
        db=db,
        root_ids=visible_ids,
    )
    preview_replies_map = await crud.document.get_preview_document_replies_for_root_ids_async(
        db=db,
        root_ids=visible_ids,
        per_root_limit=request_data.preview_reply_limit,
    )

    user_id = user.id if user is not None else None
    all_ids: list[int] = list(visible_ids)
    for replies in preview_replies_map.values():
        for r in replies:
            all_ids.append(r.id)
    liked_set: set[int] = set()
    if user_id is not None and all_ids:
        liked_set = await crud.document.get_user_liked_document_comment_ids_async(
            db=db,
            user_id=user_id,
            comment_ids=all_ids,
        )

    elements: list[schemas.document.DocumentCommentInfo] = []
    for db_comment in db_comments:
        preview_infos = [
            _build_comment_info(r, liked=r.id in liked_set)
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
        start=request_data.start,
        limit=request_data.limit,
        has_more=has_more,
        next_start=next_start,
    )


@document_comment_manage_router.post('/comment/reply/search', response_model=schemas.pagination.InifiniteScrollPagnition[schemas.document.DocumentCommentInfo])
async def search_document_comment_replies(
    request_data: schemas.document.DocumentCommentReplySearchRequest,
    db: AsyncSession = Depends(get_async_db),
    user: models.user.User = Depends(get_current_user_without_throw),
):
    db_root = await crud.document.get_document_comment_by_id_async(
        db=db,
        comment_id=request_data.root_comment_id,
    )
    if db_root is None:
        raise schemas.error.CustomException("Comment not found", code=404)
    await _ensure_document_comment_access(
        db=db,
        document_id=db_root.document_id,
        user_id=user.id if user is not None else None,
    )

    db_replies = await crud.document.search_document_comment_replies_async(
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

    total = await crud.document.count_document_comment_replies_async(
        db=db,
        root_comment_id=request_data.root_comment_id,
    )

    user_id = user.id if user is not None else None
    liked_set: set[int] = set()
    if user_id is not None and db_replies:
        liked_set = await crud.document.get_user_liked_document_comment_ids_async(
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


@document_comment_manage_router.post('/comment/like', response_model=schemas.common.NormalResponse)
async def like_document_comment(
    request_data: schemas.document.DocumentCommentLikeRequest,
    db: AsyncSession = Depends(get_async_db),
    user: models.user.User = Depends(get_current_user),
):
    db_comment = await crud.document.get_document_comment_by_id_async(
        db=db,
        comment_id=request_data.document_comment_id,
    )
    if db_comment is None:
        raise schemas.error.CustomException("Comment not found", code=404)
    await _ensure_document_comment_access(
        db=db,
        document_id=db_comment.document_id,
        user_id=user.id,
    )
    await crud.document.like_document_comment_async(
        db=db,
        comment_id=request_data.document_comment_id,
        user_id=user.id,
    )
    await db.commit()
    return schemas.common.SuccessResponse()


@document_comment_manage_router.post('/comment/unlike', response_model=schemas.common.NormalResponse)
async def unlike_document_comment(
    request_data: schemas.document.DocumentCommentLikeRequest,
    db: AsyncSession = Depends(get_async_db),
    user: models.user.User = Depends(get_current_user),
):
    db_comment = await crud.document.get_document_comment_by_id_async(
        db=db,
        comment_id=request_data.document_comment_id,
    )
    if db_comment is None:
        raise schemas.error.CustomException("Comment not found", code=404)
    await _ensure_document_comment_access(
        db=db,
        document_id=db_comment.document_id,
        user_id=user.id,
    )
    await crud.document.unlike_document_comment_async(
        db=db,
        comment_id=request_data.document_comment_id,
        user_id=user.id,
    )
    await db.commit()
    return schemas.common.SuccessResponse()


@document_comment_manage_router.post('/comment/delete', response_model=schemas.common.NormalResponse)
async def delete_document_comment(
    request_data: schemas.document.DocumentCommentDeleteRequest,
    db: AsyncSession = Depends(get_async_db),
    user: models.user.User = Depends(get_current_user),
):
    await crud.document.delete_document_comments_by_comment_ids_async(
        db=db,
        user_id=user.id,
        document_comment_ids=request_data.document_comment_ids,
    )
    await db.commit()
    return schemas.common.SuccessResponse()


@document_comment_manage_router.post('/comment/detail', response_model=schemas.document.DocumentCommentInfo)
async def get_document_comment_detail(
    request_data: schemas.document.DocumentCommentDetailRequest,
    db: AsyncSession = Depends(get_async_db),
    user: models.user.User = Depends(get_current_user_without_throw),
):
    db_comment = await crud.document.get_document_comment_by_id_async(
        db=db,
        comment_id=request_data.document_comment_id,
    )
    if db_comment is None:
        raise schemas.error.CustomException("Comment not found", code=404)
    await _ensure_document_comment_access(
        db=db,
        document_id=db_comment.document_id,
        user_id=user.id if user is not None else None,
    )
    user_id = user.id if user is not None else None
    liked_set: set[int] = set()
    if user_id is not None:
        liked_set = await crud.document.get_user_liked_document_comment_ids_async(
            db=db,
            user_id=user_id,
            comment_ids=[db_comment.id],
        )
    reply_count = (
        await crud.document.count_document_comment_replies_async(
            db=db,
            root_comment_id=db_comment.root_id if db_comment.root_id is not None else db_comment.id,
        )
        if db_comment.parent_id is None
        else 0
    )
    return _build_comment_info(
        db_comment,
        liked=db_comment.id in liked_set,
        reply_count=reply_count,
    )
