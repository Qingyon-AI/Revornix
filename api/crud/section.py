import models
from uuid import uuid4
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy.orm import selectinload
from sqlalchemy import or_
from enums.section import UserSectionRole

def create_section_podcast(db: Session,
                           section_id: int,
                           podcast_file_name: str | None = None):
    db_section_podcast = models.section.SectionPodcast(section_id=section_id,
                                                       podcast_file_name=podcast_file_name)
    db.add(db_section_podcast)
    db.flush()
    return db_section_podcast

def create_publish_section(db: Session,
                           section_id: int):
    now = datetime.now(timezone.utc)
    db_publish_section = models.section.PublishSection(section_id=section_id,
                                                       uuid=uuid4().hex,
                                                       create_time=now,
                                                       update_time=now)
    db.add(db_publish_section)
    db.flush()
    return db_publish_section

def create_label(db: Session, 
                 name: str, 
                 user_id: int):
    now = datetime.now(timezone.utc)
    db_label = models.section.Label(name=name, 
                                    user_id=user_id,
                                    create_time=now,
                                    update_time=now)
    db.add(db_label)
    db.flush()
    return db_label

def create_section_comment(db: Session, 
                           section_id: int, 
                           creator_id: int, 
                           content: str,
                           parent_id: int | None = None):
    now = datetime.now(timezone.utc)
    db_section_comment = models.section.SectionComment(section_id=section_id,
                                                       creator_id=creator_id,
                                                       content=content,
                                                       parent_id=parent_id,
                                                       create_time=now,
                                                       update_time=now)
    db.add(db_section_comment)
    db.flush()
    return db_section_comment

def create_section_user(db: Session, 
                        section_id: int, 
                        user_id: int, 
                        role: int,
                        authority: int,
                        expire_time: datetime | None = None):
    now = datetime.now(timezone.utc)
    db_section_user = models.section.SectionUser(section_id=section_id,
                                                 user_id=user_id,
                                                 role=role,
                                                 authority=authority,
                                                 create_time=now,
                                                 update_time=now,
                                                 expire_time=expire_time)
    db.add(db_section_user)
    db.flush()
    return db_section_user

def create_section(db: Session, 
                   creator_id: int,
                   title: str, 
                   description: str,
                   cover: str | None = None,
                   auto_podcast: bool | None = False):
    now = datetime.now(timezone.utc)
    db_section = models.section.Section(title=title, 
                                        creator_id=creator_id,
                                        cover=cover,
                                        description=description,
                                        auto_podcast=auto_podcast,
                                        create_time=now,
                                        update_time=now)
    db.add(db_section)
    db.flush()
    return db_section

def bind_labels_to_section(db: Session, 
                           section_id: int, 
                           label_ids: list[int]):
    now = datetime.now(timezone.utc)
    db_document_labels = [models.section.SectionLabel(section_id=section_id, 
                                                      label_id=label_id,
                                                      create_time=now,
                                                      update_time=now) for label_id in label_ids]
    db.add_all(db_document_labels)
    db.flush()
    return db_document_labels

def create_or_update_section_document(db: Session,
                                      section_id: int,
                                      document_id: int,
                                      status: int):
    now = datetime.now(timezone.utc)
    db_section_document = db.query(models.section.SectionDocument).filter_by(section_id=section_id,
                                                                             document_id=document_id).one_or_none()
    if db_section_document is None:
        db_section_document = models.section.SectionDocument(section_id=section_id,
                                                             document_id=document_id,
                                                             create_time=now,
                                                             update_time=now,
                                                             status=status)
        db.add(db_section_document)
    else:
        db_section_document.status = status
        db_section_document.update_time = now
    db.flush()
    return db_section_document

def bind_document_to_section(db: Session,
                             section_id: int,
                             document_id: int,
                             status: int = 0):
    now = datetime.now(timezone.utc)
    db_section_document = models.section.SectionDocument(section_id=section_id,
                                                         document_id=document_id,
                                                         create_time=now,
                                                         update_time=now,
                                                         status=status)
    db.add(db_section_document)
    db.flush()
    return db_section_document

def bind_section_to_date_by_date_and_section_id_and_user_id(db: Session,
                                                            section_id: int, 
                                                            date: str):
    now = datetime.now(timezone.utc)
    db_day_section = models.section.DaySection(date=date,
                                               section_id=section_id,
                                               create_time=now,
                                               update_time=now)
    db.add(db_day_section)
    db.flush()
    return db_day_section

def get_section_podcast_by_section_id(db: Session,
                                      section_id: int):
    query = db.query(models.section.SectionPodcast)
    query = query.filter(models.section.SectionPodcast.section_id == section_id,
                         models.section.SectionPodcast.delete_at == None)
    return query.first()

def get_label_by_label_id(db: Session, 
                          label_id: int, 
                          user_id: int):
    query = db.query(models.section.Label)
    query = query.filter(models.section.Label.id == label_id,
                         models.section.Label.delete_at == None,
                         models.section.Label.user_id == user_id)
    return query.one_or_none()

def get_document_sections_by_document_id(db: Session,
                                         document_id: int):
    query = db.query(models.section.Section)
    query = query.join(models.section.SectionDocument)
    query = query.filter(models.section.SectionDocument.document_id == document_id,
                         models.section.SectionDocument.delete_at == None)
    query = query.filter(models.section.Section.delete_at == None)
    query = query.order_by(models.section.Section.update_time.desc())
    return query.all()

# 只返回用户是创建者或者成员的section
def get_all_my_sections(db: Session, 
                        user_id: int):
    query = db.query(models.section.Section)
    query = query.join(models.section.SectionUser)
    query = query.filter(models.section.SectionUser.user_id == user_id,
                         models.section.SectionUser.delete_at == None,
                         models.section.SectionUser.role.in_([
                             UserSectionRole.CREATOR,
                             UserSectionRole.MEMBER
                            ])
                         )
    query = query.filter(models.section.Section.delete_at == None)
    query = query.order_by(models.section.Section.create_time.desc())
    return query.all()

def get_publish_section_by_section_id(db: Session, 
                                      section_id: int):
    query = db.query(models.section.PublishSection)
    query = query.filter(models.section.PublishSection.section_id == section_id,
                         models.section.PublishSection.delete_at == None)
    return query.first()

def get_publish_sections_by_uuid(db: Session,
                                 uuid: str):
    query = db.query(models.section.PublishSection)
    query = query.filter(models.section.PublishSection.uuid == uuid,
                         models.section.PublishSection.delete_at == None)
    return query.first()

def search_user_sections(db: Session, 
                         user_id: int, 
                         start: int | None = None, 
                         limit: int = 10, 
                         keyword: str | None = None,
                         label_ids: list[int] | None = None,
                         only_public: bool = False,
                         desc: bool = True):
    query = db.query(models.section.Section)
    query = query.filter(models.section.Section.delete_at == None)
    query = query.join(models.section.SectionUser)
    query = query.filter(models.section.SectionUser.user_id == user_id,
                         models.section.SectionUser.delete_at == None,
                         models.section.SectionUser.role.in_([
                             UserSectionRole.CREATOR,
                             UserSectionRole.MEMBER
                            ])
                         )
    if keyword is not None and len(keyword) > 0:
        query = query.filter(
            or_(
                models.section.Section.title.like(f'%{keyword}%'),
                models.section.Section.description.like(f'%{keyword}%')
            )
        )
    if only_public:
        query = query.join(models.section.PublishSection, models.section.PublishSection.section_id == models.section.Section.id)
        query = query.filter(models.section.PublishSection.delete_at == None)
    if label_ids is not None:
        query = query.join(models.section.SectionLabel)
        query = query.filter(models.section.SectionLabel.label_id.in_(label_ids),
                             models.section.SectionLabel.delete_at == None)
    if desc:
        query = query.order_by(models.section.Section.id.desc())
    else:
        query = query.order_by(models.section.Section.id.asc())
    if start is not None:
        if desc:
            query = query.filter(models.section.Section.id <= start)
        else:
            query = query.filter(models.section.Section.id >= start)
    query = query.distinct(models.section.Section.id)
    query = query.limit(limit)
    return query.all()

def count_user_sections(db: Session, 
                        user_id: int, 
                        keyword: str | None = None,
                        label_ids: list[int] | None = None,
                        only_public: bool = False):
    query = db.query(models.section.Section)
    if keyword is not None and len(keyword) > 0:
        query = query.filter(
            or_(
                models.section.Section.title.like(f'%{keyword}%'),
                models.section.Section.description.like(f'%{keyword}%')
            )
        )
    if only_public:
        query = query.join(models.section.PublishSection, models.section.PublishSection.section_id == models.section.Section.id)
        query = query.filter(models.section.PublishSection.delete_at == None)
    if label_ids is not None:
        query = query.join(models.section.SectionLabel)
        query = query.filter(models.section.SectionLabel.label_id.in_(label_ids),
                             models.section.SectionLabel.delete_at == None)
    query = query.filter(models.section.Section.delete_at == None,
                         models.section.Section.creator_id == user_id)
    query = query.distinct(models.section.Section.id)
    return query.count()

def search_next_user_section(db: Session, 
                             user_id: int, 
                             section: models.section.Section, 
                             keyword: str | None = None,
                             label_ids: list[int] | None = None,
                             only_public: bool = False,
                             desc: bool = True):
    query = db.query(models.section.Section)
    query = query.filter(models.section.Section.delete_at == None,
                         models.section.Section.creator_id == user_id)
    if keyword is not None and len(keyword) > 0:
        query = query.filter(
            or_(
                models.section.Section.title.like(f'%{keyword}%'),
                models.section.Section.description.like(f'%{keyword}%')
            )
        )
    if only_public:
        query = query.join(models.section.PublishSection, models.section.PublishSection.section_id == models.section.Section.id)
        query = query.filter(models.section.PublishSection.delete_at == None)
    if label_ids is not None:
        query = query.join(models.section.SectionLabel)
        query = query.filter(models.section.SectionLabel.label_id.in_(label_ids),
                             models.section.SectionLabel.delete_at == None)
    if desc:
        query = query.order_by(models.section.Section.id.desc())
        query = query.filter(models.section.Section.id < section.id)
    else:
        query = query.order_by(models.section.Section.id.asc())
        query = query.filter(models.section.Section.id > section.id)
    return query.first()

def search_user_subscribed_sections(db: Session, 
                                    user_id: int, 
                                    start: int | None = None, 
                                    limit: int = 10, 
                                    label_ids: list[int] | None = None,
                                    keyword: str | None = None,
                                    desc: bool | None = True):
    now = datetime.now(timezone.utc)
    query = db.query(models.section.Section)
    query = query.join(models.section.SectionUser)
    if keyword is not None and len(keyword) > 0:
        query = query.filter(
            or_(
                models.section.Section.title.like(f'%{keyword}%'),
                models.section.Section.description.like(f'%{keyword}%')
            )
        )
    if label_ids is not None:
        query = query.join(models.section.SectionLabel)
        query = query.filter(models.section.SectionLabel.label_id.in_(label_ids),
                             models.section.SectionLabel.delete_at == None)
    query = query.filter(models.section.Section.delete_at == None,
                         models.section.SectionUser.user_id == user_id,
                         models.section.SectionUser.delete_at == None,
                         models.section.SectionUser.role == UserSectionRole.SUBSCRIBER)
    query = query.filter(or_(models.section.SectionUser.expire_time > now,
                             models.section.SectionUser.expire_time == None))
    if desc:
        query = query.order_by(models.section.Section.id.desc())
    else:
        query = query.order_by(models.section.Section.id.asc())
    if start is not None:
        if desc:
            query = query.filter(models.section.Section.id <= start)
        else:
            query = query.filter(models.section.Section.id >= start)
    query = query.distinct(models.section.Section.id)
    query = query.limit(limit)
    return query.all()

def count_user_subscribed_sections(db: Session, 
                                   user_id: int, 
                                   label_ids: list[int] | None = None,
                                   keyword: str | None = None):
    now = datetime.now(timezone.utc)
    query = db.query(models.section.Section)
    query = query.join(models.section.SectionUser)
    if keyword is not None and len(keyword) > 0:
        query = query.filter(
            or_(
                models.section.Section.title.like(f'%{keyword}%'),
                models.section.Section.description.like(f'%{keyword}%')
            )
        )
    if label_ids is not None:
        query = query.join(models.section.SectionLabel)
        query = query.filter(models.section.SectionLabel.label_id.in_(label_ids),
                             models.section.SectionLabel.delete_at == None)
    query = query.filter(models.section.Section.delete_at == None,
                         models.section.SectionUser.user_id == user_id,
                         models.section.SectionUser.delete_at == None,
                         models.section.SectionUser.role == UserSectionRole.SUBSCRIBER)
    query = query.filter(or_(models.section.SectionUser.expire_time > now,
                             models.section.SectionUser.expire_time == None))
    query = query.distinct(models.section.Section.id)
    return query.count()

def search_next_user_subscribed_section(db: Session, 
                                        user_id: int, 
                                        section: models.section.Section, 
                                        label_ids: list[int] | None = None,
                                        keyword: str | None = None,
                                        desc: bool | None = True):
    now = datetime.now(timezone.utc)
    query = db.query(models.section.Section)
    query = query.join(models.section.SectionUser)
    query = query.filter(models.section.Section.delete_at == None,
                         models.section.SectionUser.user_id == user_id,
                         models.section.SectionUser.delete_at == None,
                         models.section.SectionUser.role == UserSectionRole.SUBSCRIBER)
    query = query.filter(or_(models.section.SectionUser.expire_time > now,
                             models.section.SectionUser.expire_time == None))
    if keyword is not None and len(keyword) > 0:
        query = query.filter(
            or_(
                models.section.Section.title.like(f'%{keyword}%'),
                models.section.Section.description.like(f'%{keyword}%')
            )
        )
    if label_ids is not None:
        query = query.join(models.section.SectionLabel)
        query = query.filter(models.section.SectionLabel.label_id.in_(label_ids),
                             models.section.SectionLabel.delete_at == None)
    if desc:
        query = query.order_by(models.section.Section.id.desc())
        query = query.filter(models.section.Section.id < section.id)
    else:
        query = query.order_by(models.section.Section.id.asc())
        query = query.filter(models.section.Section.id > section.id)
    return query.first()

def search_parent_degree_section_comments(db: Session, 
                                          section_id: int,
                                          keyword: str | None = None,
                                          start: int = 1,
                                          limit: int = 10):
    query = db.query(models.section.SectionComment)
    query = query.filter(models.section.SectionComment.delete_at == None,
                         models.section.SectionComment.section_id == section_id,
                         models.section.SectionComment.parent_id == None)
    if keyword is not None and len(keyword) > 0:
        query = query.filter(models.section.SectionComment.content.like(f"%{keyword}%"))
    query = query.order_by(models.section.SectionComment.id.desc())
    if start is not None:
        query = query.filter(models.section.SectionComment.id <= start)
    query = query.options(selectinload(models.section.SectionComment.creator))
    query = query.limit(limit)
    return query.all()

def count_parent_degree_section_comments(db: Session,
                                         section_id: int,
                                         keyword: str | None = None):
    query = db.query(models.section.SectionComment)
    query = query.filter(models.section.SectionComment.delete_at == None,
                         models.section.SectionComment.section_id == section_id,
                         models.section.SectionComment.parent_id == None)
    if keyword is not None and len(keyword) > 0:
        query = query.filter(models.section.SectionComment.content.like(f"%{keyword}%"))
    query = query.distinct(models.section.SectionComment.id)
    return query.count()

def search_next_parent_degree_section_comment(db: Session, 
                                              section_id: int,
                                              section_comment: models.section.SectionComment,
                                              keyword: str | None = None):
    query = db.query(models.section.SectionComment)
    query = query.filter(models.section.SectionComment.delete_at == None,
                         models.section.SectionComment.section_id == section_id)
    if keyword is not None and len(keyword) > 0:
        query = query.filter(models.section.SectionComment.content.like(f"%{keyword}%"))
    query = query.order_by(models.section.SectionComment.id.desc())
    query = query.filter(models.section.SectionComment.id < section_comment.id)
    return query.first()

def search_public_sections(db: Session, 
                           start: int | None = None, 
                           limit: int = 10, 
                           label_ids: list[int] | None = None,
                           keyword: str | None = None,
                           desc: bool | None = True):
    query = db.query(models.section.Section)
    if keyword is not None and len(keyword) > 0:
        query = query.filter(
            or_(
                models.section.Section.title.like(f'%{keyword}%'),
                models.section.Section.description.like(f'%{keyword}%')
            )
        )
    if label_ids is not None:
        query = query.join(models.section.SectionLabel)
        query = query.filter(models.section.SectionLabel.label_id.in_(label_ids),
                             models.section.SectionLabel.delete_at == None)
    query = query.filter(models.section.Section.delete_at == None)
    query = query.join(models.section.PublishSection, models.section.PublishSection.section_id == models.section.Section.id)
    query = query.filter(models.section.PublishSection.delete_at == None)
    if desc:
        query = query.order_by(models.section.Section.id.desc())
    else:
        query = query.order_by(models.section.Section.id.asc())
    if start is not None:
        if desc:
            query = query.filter(models.section.Section.id <= start)
        else:
            query = query.filter(models.section.Section.id >= start)
    query = query.distinct(models.section.Section.id)
    query = query.limit(limit)
    return query.all()

def countpublic_sections(db: Session, 
                          keyword: str | None = None,
                          label_ids: list[int] | None = None):
    query = db.query(models.section.Section)
    if keyword is not None and len(keyword) > 0:
        query = query.filter(
            or_(
                models.section.Section.title.like(f'%{keyword}%'),
                models.section.Section.description.like(f'%{keyword}%')
            )
        )
    if label_ids is not None:
        query = query.join(models.section.SectionLabel)
        query = query.filter(models.section.SectionLabel.label_id.in_(label_ids),
                             models.section.SectionLabel.delete_at == None)
    query = query.filter(models.section.Section.delete_at == None)
    query = query.join(models.section.PublishSection, models.section.PublishSection.section_id == models.section.Section.id)
    query = query.filter(models.section.PublishSection.delete_at == None)
    query = query.distinct(models.section.Section.id)
    return query.count()

def search_next_public_section(db: Session, 
                               section: models.section.Section, 
                               keyword: str | None = None,
                               label_ids: list[int] | None = None,
                               desc: bool | None = True):
    query = db.query(models.section.Section)
    query = query.filter(models.section.Section.delete_at == None)
    query = query.join(models.section.PublishSection, models.section.PublishSection.section_id == models.section.Section.id)
    query = query.filter(models.section.PublishSection.delete_at == None)
    if keyword is not None and len(keyword) > 0:
        query = query.filter(
            or_(
                models.section.Section.title.like(f'%{keyword}%'),
                models.section.Section.description.like(f'%{keyword}%')
            )
        )
    if label_ids is not None:
        query = query.join(models.section.SectionLabel)
        query = query.filter(models.section.SectionLabel.label_id.in_(label_ids),
                             models.section.SectionLabel.delete_at == None)
    if desc:
        query = query.order_by(models.section.Section.id.desc())
        query = query.filter(models.section.Section.id < section.id)
    else:
        query = query.order_by(models.section.Section.id.asc())
        query = query.filter(models.section.Section.id > section.id)
    return query.first()

def count_section_documents_by_section_id(db: Session,
                                          section_id: int):
    query = db.query(models.document.Document)
    query = query.join(models.section.SectionDocument)
    query = query.filter(models.document.Document.delete_at == None,
                         models.section.SectionDocument.section_id == section_id,
                         models.section.SectionDocument.delete_at == None)
    query = query.distinct(models.document.Document.id)
    return query.count()

def count_section_subscribers_by_section_id(db: Session,
                                            section_id: int):
    now = datetime.now(timezone.utc)
    query = db.query(models.section.SectionUser)
    query = query.filter(models.section.SectionUser.delete_at == None,
                         models.section.SectionUser.section_id == section_id,
                         models.section.SectionUser.role == UserSectionRole.SUBSCRIBER)
    query = query.filter(or_(models.section.SectionUser.expire_time > now,
                             models.section.SectionUser.expire_time == None))
    query = query.distinct(models.section.SectionUser.id)
    return query.count()

def get_users_and_section_users_by_section_id(db: Session,
                                              section_id: int,
                                              filter_roles: list[int] | None = None):
    now = datetime.now(timezone.utc)
    query = db.query(models.user.User, models.section.SectionUser)
    query = query.filter(models.section.SectionUser.delete_at == None,
                         models.section.SectionUser.section_id == section_id)
    query = query.filter(or_(models.section.SectionUser.expire_time > now,
                             models.section.SectionUser.expire_time == None))
    query = query.join(models.user.User)
    query = query.filter(models.user.User.delete_at == None)
    if filter_roles is not None:
        query = query.filter(models.section.SectionUser.role.in_(filter_roles))
    return query.all()

def get_users_by_section_id(db: Session,
                            section_id: int,
                            filter_roles: list[int] | None = None):
    query = db.query(models.user.User)
    query = query.join(models.section.SectionUser)
    query = query.filter(models.section.SectionUser.delete_at == None,
                         models.section.SectionUser.section_id == section_id)
    query = query.filter(models.user.User.delete_at == None)
    if filter_roles is not None:
        query = query.filter(models.section.SectionUser.role.in_(filter_roles))
    return query.all()

def get_section_users_by_section_id(db: Session,
                                    section_id: int,
                                    filter_roles: list[int] | None = None):
    now = datetime.now(timezone.utc)
    query = db.query(models.section.SectionUser)
    query = query.filter(models.section.SectionUser.delete_at == None,
                         models.section.SectionUser.section_id == section_id)
    query = query.filter(or_(models.section.SectionUser.expire_time > now,
                             models.section.SectionUser.expire_time == None))
    if filter_roles is not None:
        query = query.filter(models.section.SectionUser.role.in_(filter_roles))
    return query.all()

def get_section_user_by_section_id_and_user_id(db: Session, 
                                               section_id: int, 
                                               user_id: int,
                                               filter_roles: list[int] | None = None):
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

def get_section_by_user_and_date(db: Session,
                                 user_id: int, 
                                 date: str):
    query = db.query(models.section.Section)
    query = query.join(models.section.DaySection)
    query = query.join(models.section.SectionUser)
    query = query.filter(models.section.DaySection.date == date, 
                         models.section.DaySection.delete_at == None,
                         models.section.Section.delete_at == None,
                         models.section.SectionUser.delete_at == None,
                         models.section.SectionUser.user_id == user_id)
    return query.one_or_none()

def get_user_labels_by_user_id(db: Session, 
                               user_id: int):
    query = db.query(models.section.Label)
    query = query.filter(models.section.Label.delete_at == None,
                         models.section.Label.user_id == user_id)
    return query.all()

def get_section_by_section_id(db: Session, 
                              section_id: int):
    query = db.query(models.section.Section)
    query = query.filter(models.section.Section.id == section_id, 
                         models.section.Section.delete_at == None)
    return query.one_or_none()

def get_labels_by_section_id(db: Session,
                             section_id: int):
    query = db.query(models.section.Label)
    query = query.join(models.section.SectionLabel)
    query = query.filter(models.section.SectionLabel.section_id == section_id,
                         models.section.SectionLabel.delete_at == None,
                         models.section.Label.delete_at == None)
    return query.all()

def get_section_labels_by_section_id(db: Session, 
                                     section_id: int):
    query = db.query(models.section.SectionLabel)
    query = query.filter(models.section.SectionLabel.section_id == section_id,
                         models.section.SectionLabel.delete_at == None)
    return query.all()

def get_section_documents_by_section_id(db: Session,
                                        section_id: int):
    query = db.query(models.section.SectionDocument)
    query = query.filter(models.section.SectionDocument.section_id == section_id,
                         models.section.SectionDocument.delete_at == None)
    return query.all()

def get_section_document_by_section_id_and_document_id(db: Session,
                                                       section_id: int,
                                                       document_id: int):
    query = db.query(models.section.SectionDocument)
    query = query.filter(models.section.SectionDocument.section_id == section_id,
                         models.section.SectionDocument.document_id == document_id,
                         models.section.SectionDocument.delete_at == None)
    return query.one_or_none()

def get_section_documents_by_document_id(db: Session,
                                         document_id: int):
    query = db.query(models.section.SectionDocument)
    query = query.filter(models.section.SectionDocument.document_id == document_id,
                         models.section.SectionDocument.delete_at == None)
    return query.all()

def get_documents_by_section_id(db: Session, 
                                section_id: int):
    query = db.query(models.document.Document)
    query = query.join(models.section.SectionDocument).join(models.section.Section)
    query = query.filter(models.section.SectionDocument.section_id == section_id,
                         models.section.SectionDocument.delete_at == None,
                         models.document.Document.delete_at == None,
                         models.section.Section.delete_at == None)
    return query.all()

def update_section_by_section_id(db: Session,
                                 section_id: int,
                                 md_file_name: str):
    now = datetime.now(timezone.utc)
    db_section = db.query(models.section.Section).filter(models.section.Section.id == section_id).one_or_none()
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
        .one_or_none()
    if db_section_document is None:
        raise Exception("Section document is not found")
    db_section_document.status = status
    db_section_document.update_time = now
    db.flush()
    
def delete_section_by_section_id(db: Session, 
                                 section_id: int):
    now = datetime.now(timezone.utc)
    db_section = db.query(models.section.Section).filter(models.section.Section.id == section_id).one_or_none()
    if db_section is None:
        raise Exception("Section is not found")
    db_section.delete_at = now
    db.flush()
    
def delete_section_users_by_section_id(db: Session, 
                                       section_id: int):
    now = datetime.now(timezone.utc)
    db_section_users = db.query(models.section.SectionUser).filter(models.section.SectionUser.section_id == section_id,
                                                                   models.section.SectionUser.delete_at == None).all()
    for db_section_user in db_section_users:
        db_section_user.delete_at = now
        db.flush()
        
def delete_section_documents_by_section_id(db: Session,
                                           section_id: int):
    now = datetime.now(timezone.utc)
    db_section_documents = db.query(models.section.SectionDocument).filter(models.section.SectionDocument.section_id == section_id,
                                                                           models.section.SectionDocument.delete_at == None).all()
    for db_section_document in db_section_documents:
        db_section_document.delete_at = now
        db.flush()
        
def delete_section_documents_by_document_ids(db: Session, 
                                             document_ids: list[int]):
    now = datetime.now(timezone.utc)
    query = db.query(models.section.SectionDocument)
    query = query.filter(models.section.SectionDocument.document_id.in_(document_ids), 
                         models.section.SectionDocument.delete_at == None)
    query.update({models.section.SectionDocument.delete_at: now}, synchronize_session=False)

def delete_section_user_by_section_id_and_user_id(db: Session,
                                                  section_id: int,
                                                  user_id: int):
    now = datetime.now(timezone.utc)
    db_section_user = db.query(models.section.SectionUser).filter(models.section.SectionUser.section_id == section_id,
                                                                  models.section.SectionUser.user_id == user_id,
                                                                  models.section.SectionUser.delete_at == None).one_or_none()
    if db_section_user is None:
        raise Exception("Section user is not found")
    db_section_user.delete_at = now
    db.flush()
    
def delete_section_comments_by_section_comment_ids(db: Session,
                                                   section_comment_ids: list[int]):
    now = datetime.now(timezone.utc)
    query = db.query(models.section.SectionComment)
    query = query.filter(models.section.SectionComment.id.in_(section_comment_ids),
                         models.section.SectionComment.delete_at == None)
    query.update({models.section.SectionComment.delete_at: now}, synchronize_session=False)
    
def delete_section_comments_by_section_id(db: Session,
                                          section_id: int):
    now = datetime.now(timezone.utc)
    query = db.query(models.section.SectionComment)
    query = query.filter(models.section.SectionComment.section_id == section_id,
                         models.section.SectionComment.delete_at == None)
    query.update({models.section.SectionComment.delete_at: now}, synchronize_session=False)

def delete_section_labels_by_label_ids(db: Session, 
                                       label_ids: list[int]):
    delete_time = datetime.now(timezone.utc)
    query = db.query(models.section.SectionLabel)
    query = query.filter(models.section.SectionLabel.id.in_(label_ids),
                         models.section.SectionLabel.delete_at == None)
    query = query.update({models.section.SectionLabel.delete_at: delete_time}, 
                         synchronize_session=False)
    db.flush()

def delete_labels_by_label_ids(db: Session, 
                               label_ids: list[int], 
                               user_id: int):
    delete_time = datetime.now(timezone.utc)
    query = db.query(models.section.Label)
    query = query.filter(models.section.Label.id.in_(label_ids),
                         models.section.Label.delete_at == None,
                         models.section.Label.user_id == user_id,
                         models.section.Label.delete_at == None)
    query = query.update({models.section.Label.delete_at: delete_time}, 
                         synchronize_session=False)
    db.flush()
    
def delete_labels_by_section_id(db: Session,
                                section_id: int,
                                user_id: int):
    delete_time = datetime.now(timezone.utc)
    query = db.query(models.section.Label)
    query = query.join(models.section.SectionLabel)
    query = query.filter(models.section.Label.delete_at == None,
                         models.section.Label.user_id == user_id,
                         models.section.Label.delete_at == None,
                         models.section.SectionLabel.delete_at == None,
                         models.section.SectionLabel.section_id == section_id)
    query = query.update({models.section.Label.delete_at: delete_time},
                         synchronize_session=False)
    db.flush()

def unbind_document_from_section(db: Session,
                                 section_id: int,
                                 document_id: int):
    now = datetime.now(timezone.utc)
    query = db.query(models.section.SectionDocument)
    query = query.filter(models.section.SectionDocument.section_id == section_id,
                         models.section.SectionDocument.document_id == document_id)
    query.update({"delete_at": now})
    db.flush()
    
def delete_publish_section_by_section_id(db: Session,
                                         section_id: int):
    now = datetime.now(timezone.utc)
    query = db.query(models.section.PublishSection)
    query = query.filter(models.section.PublishSection.section_id == section_id)
    query.update({"delete_at": now})
    db.flush()
    
def delete_section_user_by_uuid(db: Session,
                                uuid: str):
    now = datetime.now(timezone.utc)
    query = db.query(models.section.PublishSection)
    query = query.filter(models.section.PublishSection.uuid == uuid)
    query.update({"delete_at": now})
    db.flush()
    
def delete_section_podcast_by_section_id(db: Session, 
                                         user_id: int,
                                         section_id: int):
    delete_time = datetime.now(timezone.utc)
    db_section_podcasts = db.query(models.section.SectionPodcast)\
        .join(models.section.SectionUser, models.section.SectionUser.section_id == models.section.SectionPodcast.section_id)\
        .filter(models.section.SectionPodcast.section_id == section_id,
                models.section.SectionUser.role == UserSectionRole.CREATOR,
                models.section.SectionUser.user_id == user_id,
                models.section.SectionPodcast.delete_at == None)\
        .all()
    db_podcast_ids = [podcast.id for podcast in db_section_podcasts]
    db.query(models.section.SectionPodcast)\
        .filter(models.section.SectionPodcast.id.in_(db_podcast_ids),
                models.section.SectionPodcast.delete_at == None)\
        .update({models.section.SectionPodcast.delete_at: delete_time}, synchronize_session=False)