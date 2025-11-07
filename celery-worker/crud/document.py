import models
from datetime import datetime, timezone
from sqlalchemy.orm import Session, selectinload

def create_document_podcast(db: Session,
                            document_id: int,
                            podcast_file_name: str | None = None):
    db_document_podcast = models.document.DocumentPodcast(document_id=document_id,
                                                          podcast_file_name=podcast_file_name)
    db.add(db_document_podcast)
    db.flush()
    return db_document_podcast

def get_document_podcast_by_document_id(db: Session,
                                        document_id: int):
    query = db.query(models.document.DocumentPodcast)
    query = query.filter(models.document.DocumentPodcast.document_id == document_id,
                         models.document.DocumentPodcast.delete_at == None)
    return query.first()

def get_document_by_document_id(db: Session, 
                                document_id: int):
    query = db.query(models.document.Document)
    query = query.filter(models.document.Document.id == document_id,
                         models.document.Document.delete_at == None)
    query = query.options(selectinload(models.document.Document.creator))
    return query.first()

def get_quick_note_document_by_document_id(db: Session, 
                                           document_id: int):
    query = db.query(models.document.QuickNoteDocument)
    query = query.join(models.document.Document)
    query = query.filter(models.document.QuickNoteDocument.document_id == document_id,
                         models.document.QuickNoteDocument.delete_at == None,
                         models.document.Document.delete_at == None,)
    return query.first()

def get_file_document_by_document_id(db: Session, 
                                     document_id: int):
    query = db.query(models.document.FileDocument)
    query = query.join(models.document.Document)
    query = query.filter(models.document.Document.delete_at == None,
                         models.document.FileDocument.document_id == document_id,
                         models.document.FileDocument.delete_at == None)
    return query.first()

def get_website_document_by_document_id(db: Session, 
                                        document_id: int):
    query = db.query(models.document.WebsiteDocument)
    query = query.join(models.document.Document)
    query = query.filter(models.document.WebsiteDocument.document_id == document_id,
                         models.document.WebsiteDocument.delete_at == None,
                         models.document.Document.delete_at == None)
    return query.first()

def update_file_document_by_file_document_id(db: Session,
                                             file_document_id: int,
                                             md_file_name: str):
    query = db.query(models.document.FileDocument)
    query = query.filter(models.document.FileDocument.id == file_document_id,
                         models.document.FileDocument.delete_at == None)
    db_file_document = query.first()
    if db_file_document is None:
        raise Exception("The file document which is about to update is not found")
    db_file_document.md_file_name = md_file_name
    db.flush()
    return db_file_document

def update_website_document_by_website_document_id(db: Session,
                                                   website_document_id: int,
                                                   md_file_name: str):
    query = db.query(models.document.WebsiteDocument)
    query = query.filter(models.document.WebsiteDocument.id == website_document_id,
                         models.document.WebsiteDocument.delete_at == None)
    db_website_document = query.first()
    if db_website_document is None:
        raise Exception("The website document which is about to update is not found")
    db_website_document.md_file_name = md_file_name
    db.flush()
    return db_website_document

def update_document_by_document_id(db: Session, 
                                   document_id: int,
                                   title: str | None = None, 
                                   description: str | None = None, 
                                   cover: str | None = None,
                                   category: int | None = None, 
                                   from_plat: str | None = None,
                                   ai_summary: str | None = None):
    now = datetime.now(timezone.utc)
    query = db.query(models.document.Document)
    query = query.filter(models.document.Document.id == document_id,
                         models.document.Document.delete_at == None)
    db_document = query.first()
    if db_document is None:
        raise Exception("The document which is about to update is not found")
    if title is not None:
        db_document.title = title
    if description is not None:
        db_document.description = description
    if cover is not None:
        db_document.cover = cover
    if category is not None:
        db_document.category = category
    if from_plat is not None:
        db_document.from_plat = from_plat
    if ai_summary is not None:
        db_document.ai_summary = ai_summary
    db_document.update_time = now
    db.flush()
    return db_document

def delete_document_podcast_by_document_id(db: Session, 
                                           user_id: int,
                                           document_id: int):
    delete_time = datetime.now(timezone.utc)
    db_document_podcasts = db.query(models.document.DocumentPodcast)\
        .join(models.document.UserDocument, models.document.DocumentPodcast.document_id == models.document.UserDocument.document_id)\
        .filter(models.document.DocumentPodcast.document_id == document_id,
                models.document.DocumentPodcast.delete_at == None,
                models.document.UserDocument.user_id == user_id)\
        .all()
    db_podcast_ids = [podcast.id for podcast in db_document_podcasts]
    db.query(models.document.DocumentPodcast)\
        .filter(models.document.DocumentPodcast.id.in_(db_podcast_ids),
                models.document.DocumentPodcast.delete_at == None)\
        .update({models.document.DocumentPodcast.delete_at: delete_time}, synchronize_session=False)