from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

import crud
import models
import schemas
from common.dependencies import (
    get_async_db,
    get_current_user_without_throw,
)
from router.logic_helpers import ensure_document_access

document_note_public_query_router = APIRouter()


async def _ensure_document_note_read_access(
    *,
    db: AsyncSession,
    document_id: int,
    user_id: int | None,
) -> models.document.Document:
    """Allow read if document is published OR caller is creator/collaborator."""
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


@document_note_public_query_router.post(
    "/note/public/search",
    response_model=schemas.pagination.InifiniteScrollPagnition[schemas.document.DocumentNoteInfo],
)
async def search_public_document_notes(
    search_note_request: schemas.document.SearchDocumentNoteRequest,
    db: AsyncSession = Depends(get_async_db),
    user: models.user.User = Depends(get_current_user_without_throw),
):
    """Public-readable note search.

    Notes are listed read-only; gated by published-or-collaborator access. Mirrors
    the public access pattern used by document comments.
    """
    await _ensure_document_note_read_access(
        db=db,
        document_id=search_note_request.document_id,
        user_id=user.id if user is not None else None,
    )

    notes = await crud.document.search_all_document_notes_by_document_id_async(
        db=db,
        document_id=search_note_request.document_id,
        start=search_note_request.start,
        limit=search_note_request.limit,
        keyword=search_note_request.keyword,
    )

    has_more = False
    next_start: int | None = None
    if search_note_request.limit > 0 and len(notes) == search_note_request.limit:
        next_note = await crud.document.search_next_note_by_document_note_async(
            db=db,
            document_note=notes[-1],
            keyword=search_note_request.keyword,
        )
        has_more = next_note is not None
        next_start = next_note.id if next_note is not None else None

    total = await crud.document.count_all_document_notes_by_document_id_async(
        db=db,
        document_id=search_note_request.document_id,
        keyword=search_note_request.keyword,
    )
    return schemas.pagination.InifiniteScrollPagnition(
        total=total,
        elements=notes,
        start=search_note_request.start,
        limit=search_note_request.limit,
        has_more=has_more,
        next_start=next_start,
    )
