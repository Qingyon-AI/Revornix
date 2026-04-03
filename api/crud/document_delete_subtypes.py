from datetime import datetime, timezone

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


def delete_quick_note_documents_by_document_ids(
    db: Session,
    document_ids: list[int],
) -> None:
    _soft_delete_document_subtype_records(
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


def delete_audio_documents_by_document_ids(
    db: Session,
    document_ids: list[int],
) -> None:
    _soft_delete_document_subtype_records(
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
