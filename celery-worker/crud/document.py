import models
from datetime import datetime, timezone
from sqlalchemy.orm import Session, selectinload

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

def create_website_document(
    db: Session, 
    document_id: int, 
    url: str, 
    md_file_name: str,
    keywords: str | None = None
):
    db_website_document = models.document.WebsiteDocument(document_id=document_id, 
                                                          url=url, 
                                                          md_file_name=md_file_name,
                                                          keywords=keywords)
    db.add(db_website_document)
    db.flush()
    return db_website_document

def create_file_document(
    db: Session, 
    document_id: int, 
    file_name: str, 
    md_file_name: str
):
    db_file_document = models.document.FileDocument(document_id=document_id, 
                                                    file_name=file_name, 
                                                    md_file_name=md_file_name)
    db.add(db_file_document)
    db.flush()
    return db_file_document

def create_document_podcast(
    db: Session,
    document_id: int,
    podcast_file_name: str
):
    now = datetime.now(timezone.utc)
    db_document_podcast = models.document.DocumentPodcast(document_id=document_id,
                                                          podcast_file_name=podcast_file_name,
                                                          create_time=now)
    db.add(db_document_podcast)
    db.flush()
    return db_document_podcast

def get_document_podcast_by_document_id(
    db: Session,
    document_id: int
):
    query = db.query(models.document.DocumentPodcast)
    query = query.filter(models.document.DocumentPodcast.document_id == document_id,
                         models.document.DocumentPodcast.delete_at == None)
    return query.one_or_none()

def get_document_by_document_id(
    db: Session, 
    document_id: int
):
    query = db.query(models.document.Document)
    query = query.filter(models.document.Document.id == document_id,
                         models.document.Document.delete_at == None)
    query = query.options(selectinload(models.document.Document.creator))
    return query.one_or_none()

def get_quick_note_document_by_document_id(
    db: Session, 
    document_id: int
):
    query = db.query(models.document.QuickNoteDocument)
    query = query.join(models.document.Document)
    query = query.filter(models.document.QuickNoteDocument.document_id == document_id,
                         models.document.QuickNoteDocument.delete_at == None,
                         models.document.Document.delete_at == None)
    return query.one_or_none()

def get_file_document_by_document_id(
    db: Session, 
    document_id: int
):
    query = db.query(models.document.FileDocument)
    query = query.join(models.document.Document)
    query = query.filter(models.document.Document.delete_at == None,
                         models.document.FileDocument.document_id == document_id,
                         models.document.FileDocument.delete_at == None)
    return query.one_or_none()

def get_website_document_by_document_id(
    db: Session, 
    document_id: int
):
    query = db.query(models.document.WebsiteDocument)
    query = query.join(models.document.Document)
    query = query.filter(models.document.WebsiteDocument.document_id == document_id,
                         models.document.WebsiteDocument.delete_at == None,
                         models.document.Document.delete_at == None)
    return query.one_or_none()

def delete_document_podcast_by_document_ids(
    db: Session, 
    user_id: int,
    document_ids: list[int]
):
    now = datetime.now(timezone.utc)
    
    db_document_podcasts = db.query(models.document.DocumentPodcast)\
        .join(models.document.UserDocument, models.document.DocumentPodcast.document_id == models.document.UserDocument.document_id)\
        .filter(models.document.DocumentPodcast.document_id.in_(document_ids),
                models.document.UserDocument.user_id == user_id,
                models.document.DocumentPodcast.delete_at == None)\
        .all()

    db_podcast_ids = [podcast.id for podcast in db_document_podcasts]

    db.query(models.document.DocumentPodcast)\
        .filter(models.document.DocumentPodcast.id.in_(db_podcast_ids),
                models.document.DocumentPodcast.delete_at == None)\
        .update({models.document.DocumentPodcast.delete_at: now}, synchronize_session=False)

    db.flush()