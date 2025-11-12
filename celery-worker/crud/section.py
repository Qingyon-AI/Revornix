import models
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy import or_
from enums.section import UserSectionRole

def get_section_podcast_by_section_id(
    db: Session,
    section_id: int
):
    query = db.query(models.section.SectionPodcast)
    query = query.filter(models.section.SectionPodcast.section_id == section_id,
                         models.section.SectionPodcast.delete_at == None)
    return query.one_or_none()

def get_sections_by_document_id(
    db: Session,
    document_id: int
):
    query = db.query(models.section.Section)
    query = query.join(models.section.SectionDocument)
    query = query.filter(models.section.SectionDocument.document_id == document_id,
                         models.section.SectionDocument.delete_at == None,
                         models.section.Section.delete_at == None)
    return query.all()

def get_section_user_by_section_id_and_user_id(
    db: Session, 
    section_id: int, 
    user_id: int,
    filter_roles: list[int] | None = None
):
    now = datetime.now(timezone.utc)
    query = db.query(models.section.SectionUser)
    query = query.filter(models.section.SectionUser.section_id == section_id,
                         models.section.SectionUser.user_id == user_id,
                         models.section.SectionUser.delete_at == None)
    query = query.filter(or_(models.section.SectionUser.expire_time > now, 
                             models.section.SectionUser.expire_time == None))
    if filter_roles is not None:
        query = query.filter(models.section.SectionUser.role.in_(filter_roles))
    return query.one_or_none()

def get_section_by_section_id(
    db: Session, 
    section_id: int
):
    query = db.query(models.section.Section)
    query = query.filter(models.section.Section.id == section_id, 
                         models.section.Section.delete_at == None)
    return query.one_or_none()

def update_section_document_by_section_id_and_document_id(
    db: Session,
    section_id: int,
    document_id: int,
    status: int
):
    now = datetime.now(timezone.utc)
    db_section_document = db.query(models.section.SectionDocument)\
        .filter(models.section.SectionDocument.section_id == section_id,
                models.section.SectionDocument.document_id == document_id,
                models.section.SectionDocument.delete_at == None)\
        .one_or_none()
    if db_section_document is None:
        raise Exception("Section document is not found")
    db_section_document.status = status
    db_section_document.update_time = now
    db.flush()

def delete_section_podcast_by_section_id(
    db: Session, 
    user_id: int,
    section_id: int
):
    now = datetime.now(timezone.utc)
    db_section_podcast = db.query(models.section.SectionPodcast)\
        .join(models.section.SectionUser, models.section.SectionUser.section_id == models.section.SectionPodcast.section_id)\
        .filter(models.section.SectionPodcast.section_id == section_id,
                models.section.SectionUser.role == UserSectionRole.CREATOR,
                models.section.SectionUser.user_id == user_id,
                models.section.SectionPodcast.delete_at == None)\
        .one_or_none()
    if db_section_podcast is not None:
        db_section_podcast.delete_at = now
    db.flush()