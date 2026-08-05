from datetime import datetime, timezone

from sqlalchemy import update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Session

import models


def _soft_delete_document_subtype_records(
    *,
    db: Session,
    model,
    document_ids: list[int],
) -> None:
    if not document_ids:
        return
    now = datetime.now(timezone.utc)
    (
        db.query(model)
        .filter(model.document_id.in_(document_ids), model.delete_at.is_(None))
        .update({model.delete_at: now})
    )
    db.flush()

async def _soft_delete_document_subtype_records_async(
    *,
    db: AsyncSession,
    model,
    document_ids: list[int],
) -> None:
    if not document_ids:
        return
    now = datetime.now(timezone.utc)
    await db.execute(
        update(model)
        .where(model.document_id.in_(document_ids), model.delete_at.is_(None))
        .values(delete_at=now)
    )
    await db.flush()


def delete_quick_note_documents_by_document_ids(
    db: Session,
    document_ids: list[int],
) -> None:
    _soft_delete_document_subtype_records(
        db=db,
        model=models.document.QuickNoteDocument,
        document_ids=document_ids,
    )

async def delete_quick_note_documents_by_document_ids_async(
    db: AsyncSession,
    document_ids: list[int],
) -> None:
    await _soft_delete_document_subtype_records_async(
        db=db,
        model=models.document.QuickNoteDocument,
        document_ids=document_ids,
    )


def delete_website_documents_by_document_ids(
    db: Session,
    document_ids: list[int],
) -> None:
    _soft_delete_document_subtype_records(
        db=db,
        model=models.document.WebsiteDocument,
        document_ids=document_ids,
    )
    _soft_delete_document_subtype_records(
        db=db,
        model=models.document.WebsiteDocumentSnapshot,
        document_ids=document_ids,
    )

async def delete_website_documents_by_document_ids_async(
    db: AsyncSession,
    document_ids: list[int],
) -> None:
    await _soft_delete_document_subtype_records_async(
        db=db,
        model=models.document.WebsiteDocument,
        document_ids=document_ids,
    )
    await _soft_delete_document_subtype_records_async(
        db=db,
        model=models.document.WebsiteDocumentSnapshot,
        document_ids=document_ids,
    )


def delete_audio_documents_by_document_ids(
    db: Session,
    document_ids: list[int],
) -> None:
    _soft_delete_document_subtype_records(
        db=db,
        model=models.document.AudioDocument,
        document_ids=document_ids,
    )

async def delete_audio_documents_by_document_ids_async(
    db: AsyncSession,
    document_ids: list[int],
) -> None:
    await _soft_delete_document_subtype_records_async(
        db=db,
        model=models.document.AudioDocument,
        document_ids=document_ids,
    )


def delete_file_documents_by_document_ids(
    db: Session,
    document_ids: list[int],
) -> None:
    _soft_delete_document_subtype_records(
        db=db,
        model=models.document.FileDocument,
        document_ids=document_ids,
    )

async def delete_file_documents_by_document_ids_async(
    db: AsyncSession,
    document_ids: list[int],
) -> None:
    await _soft_delete_document_subtype_records_async(
        db=db,
        model=models.document.FileDocument,
        document_ids=document_ids,
    )
