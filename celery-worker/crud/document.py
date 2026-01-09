import models
from datetime import datetime, timezone
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
    keywords: str | None = None
):
    db_website_document = models.document.WebsiteDocument(document_id=document_id, 
                                                          url=url, 
                                                          keywords=keywords)
    db.add(db_website_document)
    db.flush()
    return db_website_document

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
    query = query.filter(models.document.Label.delete_at == None,
                         models.document.Label.user_id == user_id)
    return query.all()

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