import models
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy import or_

def get_document_sections_by_document_id(db: Session,
                                         document_id: int):
    query = db.query(models.section.Section)
    query = query.join(models.section.SectionDocument)
    query = query.filter(models.section.SectionDocument.document_id == document_id,
                         models.section.SectionDocument.delete_at == None)
    query = query.filter(models.section.Section.delete_at == None)
    query = query.order_by(models.section.Section.update_time.desc())
    return query.all()

def get_section_user_by_section_id_and_user_id(db: Session, 
                                               section_id: int, 
                                               user_id: int):
    now = datetime.now(timezone.utc)
    query = db.query(models.section.SectionUser)
    query = query.filter(models.section.SectionUser.section_id == section_id,
                         models.section.SectionUser.user_id == user_id,
                         models.section.SectionUser.delete_at == None)
    query = query.filter(or_(models.section.SectionUser.expire_time > now, 
                             models.section.SectionUser.expire_time == None))
    return query.first()

def get_section_by_section_id(db: Session, 
                              section_id: int):
    query = db.query(models.section.Section)
    query = query.filter(models.section.Section.id == section_id, 
                         models.section.Section.delete_at == None)
    return query.first()

def update_section_by_section_id(db: Session,
                                 section_id: int,
                                 md_file_name: str):
    now = datetime.now(timezone.utc)
    db_section = db.query(models.section.Section).filter(models.section.Section.id == section_id).first()
    if db_section is None:
        raise Exception("Section is not found")
    db_section.md_file_name = md_file_name
    db_section.update_time = now
    db.flush()

def update_section_document_by_section_id_and_document_id(db: Session,
                                                          section_id: int,
                                                          document_id: int,
                                                          status: int):
    now = datetime.now(timezone.utc)
    db_section_document = db.query(models.section.SectionDocument)\
        .filter(models.section.SectionDocument.section_id == section_id,
                models.section.SectionDocument.document_id == document_id,
                models.section.SectionDocument.delete_at == None)\
        .first()
    if db_section_document is None:
        raise Exception("Section document is not found")
    db_section_document.status = status
    db_section_document.update_time = now
    db.flush()