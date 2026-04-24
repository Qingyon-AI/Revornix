import models
from datetime import datetime, timezone
from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Session, selectinload

def create_document_labels(
    db: Session, 
    document_id: int, 
    label_ids: list[int]
):
    now = datetime.now(timezone.utc)
    db_document_labels = [models.document.DocumentLabel(document_id=document_id, 
                                                        label_id=label_id,
                                                        create_time=now) for label_id in label_ids]
    db.add_all(db_document_labels)
    db.flush()
    return db_document_labels


async def create_document_labels_async(
    db: AsyncSession,
    document_id: int,
    label_ids: list[int],
):
    now = datetime.now(timezone.utc)
    db_document_labels = [
        models.document.DocumentLabel(
            document_id=document_id,
            label_id=label_id,
            create_time=now,
        )
        for label_id in label_ids
    ]
    db.add_all(db_document_labels)
    await db.flush()
    return db_document_labels

def create_quick_note_document(
    db: Session, 
    document_id: int, 
    content: str
):
    db_quick_note_document = models.document.QuickNoteDocument(document_id=document_id, 
                                                               content=content)
    db.add(db_quick_note_document)
    db.flush()
    return db_quick_note_document

def create_audio_document(
    db: Session,
    document_id: int,
    audio_file_name: str
):
    db_audio_document = models.document.AudioDocument(
        document_id=document_id,
        audio_file_name=audio_file_name
    )
    db.add(db_audio_document)
    db.flush()
    return db_audio_document

def create_website_document(
    db: Session, 
    document_id: int, 
    url: str, 
    keywords: str | None = None
):
    db_website_document = models.document.WebsiteDocument(document_id=document_id, 
                                                          url=url, 
                                                          keywords=keywords)
    db.add(db_website_document)
    db.flush()
    return db_website_document


def create_website_document_snapshot(
    db: Session,
    document_id: int,
    url: str,
    title: str | None = None,
    description: str | None = None,
    cover: str | None = None,
    md_file_name: str | None = None,
):
    now = datetime.now(timezone.utc)
    db_snapshot = models.document.WebsiteDocumentSnapshot(
        document_id=document_id,
        url=url,
        title=title,
        description=description,
        cover=cover,
        md_file_name=md_file_name,
        create_time=now,
    )
    db.add(db_snapshot)
    db.flush()
    return db_snapshot


async def create_website_document_snapshot_async(
    db: AsyncSession,
    document_id: int,
    url: str,
    title: str | None = None,
    description: str | None = None,
    cover: str | None = None,
    md_file_name: str | None = None,
):
    now = datetime.now(timezone.utc)
    db_snapshot = models.document.WebsiteDocumentSnapshot(
        document_id=document_id,
        url=url,
        title=title,
        description=description,
        cover=cover,
        md_file_name=md_file_name,
        create_time=now,
    )
    db.add(db_snapshot)
    await db.flush()
    return db_snapshot

def create_file_document(
    db: Session, 
    document_id: int, 
    file_name: str
):
    db_file_document = models.document.FileDocument(document_id=document_id, 
                                                    file_name=file_name)
    db.add(db_file_document)
    db.flush()
    return db_file_document

def get_user_labels_by_user_id(
    db: Session, 
    user_id: int
):
    query = db.query(models.document.Label)
    query = query.filter(models.document.Label.delete_at.is_(None),
                         models.document.Label.user_id == user_id)
    return query.all()


async def get_user_labels_by_user_id_async(
    db: AsyncSession,
    user_id: int,
):
    stmt = select(models.document.Label).where(
        models.document.Label.delete_at.is_(None),
        models.document.Label.user_id == user_id,
    )
    return list((await db.execute(stmt)).scalars().all())

def get_document_by_document_id(
    db: Session, 
    document_id: int
):
    query = db.query(models.document.Document)
    query = query.filter(models.document.Document.id == document_id,
                         models.document.Document.delete_at.is_(None))
    query = query.options(selectinload(models.document.Document.creator))
    return query.one_or_none()


async def get_document_by_document_id_async(
    db: AsyncSession,
    document_id: int,
):
    stmt = (
        select(models.document.Document)
        .options(selectinload(models.document.Document.creator))
        .where(
            models.document.Document.id == document_id,
            models.document.Document.delete_at.is_(None),
        )
    )
    return (await db.execute(stmt)).scalar_one_or_none()

def get_quick_note_document_by_document_id(
    db: Session, 
    document_id: int
):
    query = db.query(models.document.QuickNoteDocument)
    query = query.join(models.document.Document)
    query = query.filter(models.document.QuickNoteDocument.document_id == document_id,
                         models.document.QuickNoteDocument.delete_at.is_(None),
                         models.document.Document.delete_at.is_(None))
    return query.one_or_none()


async def get_quick_note_document_by_document_id_async(
    db: AsyncSession,
    document_id: int,
):
    stmt = (
        select(models.document.QuickNoteDocument)
        .join(models.document.Document)
        .where(
            models.document.QuickNoteDocument.document_id == document_id,
            models.document.QuickNoteDocument.delete_at.is_(None),
            models.document.Document.delete_at.is_(None),
        )
    )
    return (await db.execute(stmt)).scalar_one_or_none()

def get_audio_document_by_document_id(
    db: Session,
    document_id: int
):
    query = db.query(models.document.AudioDocument)
    query = query.join(models.document.Document)
    query = query.filter(models.document.Document.delete_at.is_(None),
                         models.document.AudioDocument.document_id == document_id,
                         models.document.AudioDocument.delete_at.is_(None))
    return query.one_or_none()


async def get_audio_document_by_document_id_async(
    db: AsyncSession,
    document_id: int,
):
    stmt = (
        select(models.document.AudioDocument)
        .join(models.document.Document)
        .where(
            models.document.Document.delete_at.is_(None),
            models.document.AudioDocument.document_id == document_id,
            models.document.AudioDocument.delete_at.is_(None),
        )
    )
    return (await db.execute(stmt)).scalar_one_or_none()

def get_file_document_by_document_id(
    db: Session, 
    document_id: int
):
    query = db.query(models.document.FileDocument)
    query = query.join(models.document.Document)
    query = query.filter(models.document.Document.delete_at.is_(None),
                         models.document.FileDocument.document_id == document_id,
                         models.document.FileDocument.delete_at.is_(None))
    return query.one_or_none()


async def get_file_document_by_document_id_async(
    db: AsyncSession,
    document_id: int,
):
    stmt = (
        select(models.document.FileDocument)
        .join(models.document.Document)
        .where(
            models.document.Document.delete_at.is_(None),
            models.document.FileDocument.document_id == document_id,
            models.document.FileDocument.delete_at.is_(None),
        )
    )
    return (await db.execute(stmt)).scalar_one_or_none()

def get_website_document_by_document_id(
    db: Session, 
    document_id: int
):
    query = db.query(models.document.WebsiteDocument)
    query = query.join(models.document.Document)
    query = query.filter(models.document.WebsiteDocument.document_id == document_id,
                         models.document.WebsiteDocument.delete_at.is_(None),
                         models.document.Document.delete_at.is_(None))
    return query.one_or_none()


async def get_website_document_by_document_id_async(
    db: AsyncSession,
    document_id: int,
):
    stmt = (
        select(models.document.WebsiteDocument)
        .join(models.document.Document)
        .where(
            models.document.WebsiteDocument.document_id == document_id,
            models.document.WebsiteDocument.delete_at.is_(None),
            models.document.Document.delete_at.is_(None),
        )
    )
    return (await db.execute(stmt)).scalar_one_or_none()


async def get_document_subtype_bundle_by_document_id_async(
    db: AsyncSession,
    document_id: int,
):
    stmt = (
        select(
            models.document.WebsiteDocument,
            models.document.FileDocument,
            models.document.QuickNoteDocument,
            models.document.AudioDocument,
        )
        .select_from(models.document.Document)
        .outerjoin(
            models.document.WebsiteDocument,
            and_(
                models.document.WebsiteDocument.document_id == models.document.Document.id,
                models.document.WebsiteDocument.delete_at.is_(None),
            ),
        )
        .outerjoin(
            models.document.FileDocument,
            and_(
                models.document.FileDocument.document_id == models.document.Document.id,
                models.document.FileDocument.delete_at.is_(None),
            ),
        )
        .outerjoin(
            models.document.QuickNoteDocument,
            and_(
                models.document.QuickNoteDocument.document_id == models.document.Document.id,
                models.document.QuickNoteDocument.delete_at.is_(None),
            ),
        )
        .outerjoin(
            models.document.AudioDocument,
            and_(
                models.document.AudioDocument.document_id == models.document.Document.id,
                models.document.AudioDocument.delete_at.is_(None),
            ),
        )
        .where(
            models.document.Document.id == document_id,
            models.document.Document.delete_at.is_(None),
        )
    )
    return (await db.execute(stmt)).one_or_none()
