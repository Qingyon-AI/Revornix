import models
from datetime import datetime, timezone, timedelta
from sqlalchemy import or_, func, cast, Date
from sqlalchemy.orm import Session, selectinload
from enums.document import UserDocumentAuthority

def create_document_podcast(db: Session,
                            document_id: int,
                            podcast_file_name: str):
    now = datetime.now(timezone.utc)
    db_document_podcast = models.document.DocumentPodcast(document_id=document_id,
                                                          podcast_file_name=podcast_file_name,
                                                          create_time=now)
    db.add(db_document_podcast)
    db.flush()
    return db_document_podcast

def create_document_note(db: Session, 
                         user_id: int, 
                         document_id: int, 
                         content: str):
    now = datetime.now(timezone.utc)
    db_document_note = models.document.DocumentNote(user_id=user_id, 
                                                    document_id=document_id, 
                                                    content=content,
                                                    create_time=now)
    db.add(db_document_note)
    db.flush()
    return db_document_note

def create_label(db: Session, 
                 name: str, 
                 user_id: int):
    now = datetime.now(timezone.utc)
    db_label = models.document.Label(name=name, 
                                     user_id=user_id,
                                     create_time=now)
    db.add(db_label)
    db.flush()
    return db_label

def create_base_document(db: Session, 
                         creator_id: int,
                         title: str, 
                         category: int, 
                         from_plat: str,
                         cover: str | None = None,
                         description: str | None = None, 
                         ai_summary: str | None = None):
    now = datetime.now(timezone.utc)
    db_document = models.document.Document(category=category, 
                                           creator_id=creator_id,
                                           title=title, 
                                           cover=cover,
                                           description=description, 
                                           from_plat=from_plat,
                                           create_time=now,
                                           ai_summary=ai_summary)
    db.add(db_document)
    db.flush()
    return db_document

def create_quick_note_document(db: Session, 
                               document_id: int, 
                               content: str):
    db_quick_note_document = models.document.QuickNoteDocument(document_id=document_id, 
                                                               content=content)
    db.add(db_quick_note_document)
    db.flush()
    return db_quick_note_document

def create_website_document(db: Session, 
                            document_id: int, 
                            url: str, 
                            md_file_name: str,
                            keywords: str | None = None):
    db_website_document = models.document.WebsiteDocument(document_id=document_id, 
                                                          url=url, 
                                                          md_file_name=md_file_name,
                                                          keywords=keywords)
    db.add(db_website_document)
    db.flush()
    return db_website_document

def create_file_document(db: Session, 
                         document_id: int, 
                         file_name: str, 
                         md_file_name: str):
    db_file_document = models.document.FileDocument(document_id=document_id, 
                                                    file_name=file_name, 
                                                    md_file_name=md_file_name)
    db.add(db_file_document)
    db.flush()
    return db_file_document

def create_user_document(db: Session, 
                         user_id: int, 
                         document_id: int, 
                         authority: int):
    now = datetime.now(timezone.utc)
    db_user_document = models.document.UserDocument(user_id=user_id, 
                                                    document_id=document_id, 
                                                    authority=authority,
                                                    create_time=now)
    db.add(db_user_document)
    db.flush()
    return db_user_document

def create_document_labels(db: Session, 
                           document_id: int, 
                           label_ids: list[int]):
    now = datetime.now(timezone.utc)
    db_document_labels = [models.document.DocumentLabel(document_id=document_id, 
                                                        label_id=label_id,
                                                        create_time=now) for label_id in label_ids]
    db.add_all(db_document_labels)
    db.flush()
    return db_document_labels

def get_website_document_by_user_id_and_url(db: Session, 
                                            user_id: int,
                                            url: str):
    query = db.query(models.document.Document)
    query = query.join(models.document.WebsiteDocument)
    query = query.filter(models.document.WebsiteDocument.url == url, 
                         models.document.WebsiteDocument.delete_at == None,
                         models.document.UserDocument.user_id == user_id,
                         models.document.Document.delete_at == None)
    return query.one_or_none()

def get_sections_by_document_id(db: Session,
                                document_id: int):
    query = db.query(models.section.Section)
    query = query.join(models.section.SectionDocument)
    query = query.filter(models.section.SectionDocument.document_id == document_id,
                         models.section.SectionDocument.delete_at == None,
                         models.section.Section.delete_at == None)
    return query.all()

def get_document_podcast_by_document_id(db: Session,
                                        document_id: int):
    query = db.query(models.document.DocumentPodcast)
    query = query.filter(models.document.DocumentPodcast.document_id == document_id,
                         models.document.DocumentPodcast.delete_at == None)
    return query.one_or_none()

def get_document_summary_by_user_id(db: Session,
                                    user_id: int,
                                    duration: int = 30):
    # 获取最近30天的日期范围
    start_date = datetime.now(timezone.utc) - timedelta(days=duration)
    
    # 查询每天的文档创建数量
    query = db.query(
            cast(models.document.Document.create_time, Date).label("date"),  # 转换为日期
            func.count().label("total")
        )
    query = query.join(models.document.UserDocument)  # 连接用户文档表
    query = query.filter(models.document.Document.create_time >= start_date)  # 仅查询最近duration天
    query = query.filter(models.document.UserDocument.user_id == user_id)  # 仅查询指定用户的文档
    query = query.filter(models.document.UserDocument.delete_at == None)
    query = query.filter(models.document.Document.delete_at == None)
    query = query.group_by(cast(models.document.Document.create_time, Date))  # 按天分组
    query = query.order_by(cast(models.document.Document.create_time, Date))  # 按日期升序
    return query.all()

def search_section_documents(db: Session,
                             section_id: int,
                             start: int | None = None, 
                             limit: int = 10, 
                             keyword: str | None = None,
                             desc: bool = True):
    query = db.query(models.document.Document)
    query = query.join(models.section.SectionDocument, models.document.Document.id == models.section.SectionDocument.document_id)
    query = query.filter(models.section.SectionDocument.section_id == section_id,
                         models.section.SectionDocument.delete_at == None,
                         models.document.Document.delete_at == None)
    if keyword is not None and len(keyword) > 0:
        query = query.filter(models.document.Document.title.like(f"%{keyword}%"))
    if desc:
        query = query.order_by(models.document.Document.id.desc())
    else:
        query = query.order_by(models.document.Document.id.asc())
    if start is not None:
        if desc:
            query = query.filter(models.document.Document.id <= start)
        else:
            query = query.filter(models.document.Document.id >= start)
    query = query.options(selectinload(models.document.Document.creator))
    query = query.limit(limit)
    return query.all()

def search_next_section_document(db: Session,
                                 section_id: int,
                                 document: models.document.Document, 
                                 keyword: str | None = None,
                                 desc: bool = True):
    query = db.query(models.document.Document)
    query = query.join(models.section.SectionDocument, models.document.Document.id == models.section.SectionDocument.document_id)
    query = query.filter(models.section.SectionDocument.section_id == section_id,
                         models.section.SectionDocument.delete_at == None)
    query = query.filter(models.document.Document.delete_at == None)
    if keyword is not None and len(keyword) > 0:
        query = query.filter(models.document.Document.title.like(f"%{keyword}%"))
    if desc:
        query = query.order_by(models.document.Document.id.desc())
        query = query.filter(models.document.Document.id < document.id)
    else:
        query = query.order_by(models.document.Document.id.asc())
        query = query.filter(models.document.Document.id > document.id)
    return query.first()

def count_section_documents(db: Session,
                            section_id: int,
                            keyword: str | None = None):
    query = db.query(func.count(models.document.Document.id))
    query = query.join(models.section.SectionDocument, models.document.Document.id == models.section.SectionDocument.document_id)
    query = query.filter(models.section.SectionDocument.section_id == section_id,
                         models.section.SectionDocument.delete_at == None)
    query = query.filter(models.document.Document.delete_at == None)
    if keyword is not None and len(keyword) > 0:
        query = query.filter(models.document.Document.title.like(f"%{keyword}%"))
    return query.count()

def search_next_user_document(db: Session, 
                              user_id: int, 
                              document: models.document.Document, 
                              keyword: str | None = None,
                              label_ids: list[int] | None = None,
                              desc: bool = True):
    query = db.query(models.document.Document)
    query = query.join(models.document.UserDocument).outerjoin(models.document.DocumentLabel)
    query = query.filter(models.document.UserDocument.user_id == user_id,
                         models.document.UserDocument.delete_at == None)
    query = query.filter(models.document.Document.delete_at == None)
    if keyword is not None and len(keyword) > 0:
        query = query.filter(models.document.Document.title.like(f"%{keyword}%"))
    if label_ids is not None:
        query = query.filter(models.document.DocumentLabel.delete_at == None,
                             models.document.DocumentLabel.label_id.in_(label_ids))
    if desc:
        query = query.order_by(models.document.Document.id.desc())
        query = query.filter(models.document.Document.id < document.id)
    else:
        query = query.order_by(models.document.Document.id.asc())
        query = query.filter(models.document.Document.id > document.id)
    return query.first()

def search_user_documents(db: Session, 
                          user_id: int, 
                          start: int | None = None, 
                          limit: int = 10, 
                          keyword: str | None = None,
                          label_ids: list[int] | None = None,
                          desc: bool = True):
    query = db.query(models.document.Document)
    query = query.join(models.document.UserDocument).outerjoin(models.document.DocumentLabel)
    query = query.filter(models.document.UserDocument.user_id == user_id,
                         models.document.UserDocument.delete_at == None)
    query = query.filter(models.document.Document.delete_at == None)
    if keyword is not None and len(keyword) > 0:
        query = query.filter(models.document.Document.title.like(f'%{keyword}%'))
    if label_ids is not None:
        query = query.filter(models.document.DocumentLabel.delete_at == None,
                             models.document.DocumentLabel.label_id.in_(label_ids))
    if desc:
        query = query.order_by(models.document.Document.id.desc())
    else:
        query = query.order_by(models.document.Document.id.asc())
    if start is not None:
        if desc:
            query = query.filter(models.document.Document.id <= start)
        else:
            query = query.filter(models.document.Document.id >= start)
    query = query.options(selectinload(models.document.Document.creator))
    query = query.distinct(models.document.Document.id)
    query = query.limit(limit)
    return query.all()

def count_user_documents(db: Session, 
                         user_id: int, 
                         keyword: str | None = None, 
                         label_ids: list[int] | None = None):
    query = db.query(models.document.Document)
    query = query.join(models.document.UserDocument).outerjoin(models.document.DocumentLabel)
    query = query.filter(models.document.UserDocument.user_id == user_id,
                         models.document.UserDocument.delete_at == None)
    query = query.filter(models.document.Document.delete_at == None)
    if keyword is not None and len(keyword) > 0:
        query = query.filter(models.document.Document.title.like(f'%{keyword}%'))
    if label_ids is not None:
        query = query.filter(models.document.DocumentLabel.delete_at == None,
                             models.document.DocumentLabel.label_id.in_(label_ids))
    query = query.distinct(models.document.Document.id)
    return query.count()

def get_star_document_by_user_id_and_document_id(db: Session, 
                                                 user_id: int, 
                                                 document_id: int):
    query = db.query(models.document.StarDocument)
    query = query.join(models.document.Document, models.document.StarDocument.document_id == models.document.Document.id)
    query = query.filter(models.document.Document.delete_at == None,
                         models.document.StarDocument.user_id == user_id,
                         models.document.StarDocument.document_id == document_id,
                         models.document.StarDocument.delete_at == None)
    return query.one_or_none()

def get_document_by_document_id(db: Session, 
                                document_id: int):
    query = db.query(models.document.Document)
    query = query.filter(models.document.Document.id == document_id,
                         models.document.Document.delete_at == None)
    query = query.options(selectinload(models.document.Document.creator))
    return query.one_or_none()

def get_documents_by_document_ids(db: Session,
                                  document_ids: list[int]):
    query = db.query(models.document.Document)
    query = query.filter(models.document.Document.id.in_(document_ids),
                         models.document.Document.delete_at == None)
    query = query.options(selectinload(models.document.Document.creator))
    return query.all()

def get_file_document_by_document_id(db: Session, 
                                     document_id: int):
    query = db.query(models.document.FileDocument)
    query = query.join(models.document.Document)
    query = query.filter(models.document.Document.delete_at == None,
                         models.document.FileDocument.document_id == document_id,
                         models.document.FileDocument.delete_at == None)
    return query.one_or_none()

def get_website_document_by_document_id(db: Session, 
                                        document_id: int):
    query = db.query(models.document.WebsiteDocument)
    query = query.join(models.document.Document)
    query = query.filter(models.document.WebsiteDocument.document_id == document_id,
                         models.document.WebsiteDocument.delete_at == None,
                         models.document.Document.delete_at == None)
    return query.one_or_none()

def get_quick_note_document_by_document_id(db: Session, 
                                           document_id: int):
    query = db.query(models.document.QuickNoteDocument)
    query = query.join(models.document.Document)
    query = query.filter(models.document.QuickNoteDocument.document_id == document_id,
                         models.document.QuickNoteDocument.delete_at == None,
                         models.document.Document.delete_at == None)
    return query.one_or_none()

def search_all_documents(db: Session, 
                         start: int | None = None, 
                         limit: int = 10, 
                         keyword: str | None = None,
                         label_ids: list[int] | None = None):
    query = db.query(models.document.Document)
    query = query.join(models.document.UserDocument).outerjoin(models.document.DocumentLabel)
    query = query.filter(models.document.UserDocument.delete_at == None,
                         models.document.Document.delete_at == None)
    if keyword is not None and len(keyword) > 0:
        query = query.filter(models.document.Document.title.like(f'%{keyword}%'))
    if label_ids is not None:
        query = query.filter(models.document.DocumentLabel.delete_at == None,
                             models.document.DocumentLabel.label_id.in_(label_ids))
    query = query.order_by(models.document.Document.create_time.desc())
    if start is not None:
        query = query.filter(models.document.Document.id <= start)
    query = query.options(selectinload(models.document.Document.creator))
    query = query.distinct(models.document.Document.id)
    query = query.limit(limit)
    return query.all()

def count_all_documents(db: Session, 
                        keyword: str | None = None, 
                        label_ids: list[int] | None = None):
    query = db.query(models.document.Document)
    query = query.join(models.document.UserDocument).outerjoin(models.document.DocumentLabel)
    query = query.filter(models.document.UserDocument.delete_at == None)
    query = query.filter(models.document.Document.delete_at == None)
    if keyword is not None and len(keyword) > 0:
        query = query.filter(models.document.Document.title.like(f'%{keyword}%'))
    if label_ids is not None:
        query = query.filter(models.document.DocumentLabel.delete_at == None,
                             models.document.DocumentLabel.label_id.in_(label_ids))
    query = query.distinct(models.document.Document.id)
    return query.count()

def search_next_all_document(db: Session, 
                             document: models.document.Document, 
                             keyword: str | None = None,
                             label_ids: list[int] | None = None):
    query = db.query(models.document.Document)
    query = query.join(models.document.UserDocument).outerjoin(models.document.DocumentLabel)
    query = query.filter(models.document.UserDocument.delete_at == None,
                         models.document.Document.delete_at == None)
    if keyword is not None and len(keyword) > 0:
        query = query.filter(models.document.Document.title.like(f"%{keyword}%"))
    if label_ids is not None:
        query = query.filter(models.document.DocumentLabel.delete_at == None,
                             models.document.DocumentLabel.label_id.in_(label_ids))
    query = query.order_by(models.document.Document.id.desc())
    query = query.filter(models.document.Document.create_time < document.create_time)
    return query.first()

def search_all_document_notes_by_document_id(db: Session, 
                                             document_id: int,
                                             start: int | None = None, 
                                             limit: int = 10, 
                                             keyword: str | None = None):
    query = db.query(models.document.DocumentNote)
    query = query.filter(models.document.DocumentNote.document_id == document_id,
                         models.document.DocumentNote.delete_at == None)
    if keyword is not None and len(keyword) > 0:
        query = query.filter(models.document.DocumentNote.content.like(f'%{keyword}%'))
    query = query.order_by(models.document.DocumentNote.id.desc())
    if start is not None:
        query = query.filter(models.document.DocumentNote.id <= start)
    query = query.options(selectinload(models.document.DocumentNote.user))
    query = query.distinct(models.document.DocumentNote.id)
    query = query.limit(limit)
    return query.all()

def count_all_document_notes_by_document_id(db: Session, 
                                            document_id: int,
                                            keyword: str | None = None):
    query = db.query(models.document.DocumentNote)
    query = query.filter(models.document.DocumentNote.document_id == document_id,
                         models.document.DocumentNote.delete_at == None)
    if keyword is not None and len(keyword) > 0:
        query = query.filter(models.document.DocumentNote.content.like(f'%{keyword}%'))
    query = query.distinct(models.document.DocumentNote.id)
    return query.count()

def search_next_note_by_document_note(db: Session, 
                                      document_note: models.document.DocumentNote,
                                      keyword: str | None = None):
    query = db.query(models.document.DocumentNote)
    query = query.filter(models.document.DocumentNote.delete_at == None)
    if keyword is not None and len(keyword) > 0:
        query = query.filter(models.document.DocumentNote.content.like(f"%{keyword}%"))
    query = query.order_by(models.document.DocumentNote.id.desc())
    query = query.filter(models.document.DocumentNote.id < document_note.id)
    return query.first()

def get_labels_summary(db: Session,
                       user_id: int):
    query = db.query(models.document.Label, func.count(models.document.DocumentLabel.id).label('count'))
    query = query.join(models.document.DocumentLabel,
                       models.document.DocumentLabel.label_id == models.document.Label.id)
    query = query.join(models.document.UserDocument, 
                       models.document.UserDocument.document_id == models.document.DocumentLabel.document_id)
    query = query.join(models.document.Document,
                       models.document.Document.id == models.document.DocumentLabel.document_id)
    query = query.filter(models.document.UserDocument.delete_at == None,
                         models.document.UserDocument.user_id == user_id,
                         models.document.DocumentLabel.delete_at == None,
                         models.document.Label.delete_at == None,
                         models.document.Document.delete_at == None)
    query = query.group_by(models.document.Label.id)
    query = query.order_by(func.count(models.document.DocumentLabel.document_id).desc())
    return query.all()

def get_labels_by_document_id(db: Session, 
                              document_id: int):
    query = db.query(models.document.Label)
    query = query.join(models.document.DocumentLabel)
    query = query.filter(models.document.DocumentLabel.document_id == document_id,
                         models.document.DocumentLabel.delete_at == None,
                         models.document.Label.delete_at == None)
    return query.all()

def get_document_labels_by_document_id(db: Session, 
                                       document_id: int):
    query = db.query(models.document.DocumentLabel)
    query = query.filter(models.document.DocumentLabel.document_id == document_id,
                         models.document.DocumentLabel.delete_at == None)
    return query.all()

def get_user_labels_by_user_id(db: Session, 
                               user_id: int):
    query = db.query(models.document.Label)
    query = query.filter(models.document.Label.delete_at == None,
                         models.document.Label.user_id == user_id)
    return query.all()

def search_user_unread_documents(db: Session, 
                                 user_id: int, 
                                 start: int | None = None, 
                                 limit: int = 10, 
                                 keyword: str | None = None,
                                 label_ids: list[int] | None = None,
                                 desc: bool = True):
    query = db.query(models.document.Document)
    query = query.join(models.document.UserDocument).outerjoin(models.document.ReadDocument).outerjoin(models.document.DocumentLabel)
    query = query.filter(models.document.UserDocument.user_id == user_id,
                         models.document.Document.delete_at == None)
    # 过滤没有对应的ReadDocument记录的文档
    query = query.filter(or_(models.document.ReadDocument.delete_at != None, 
                             models.document.ReadDocument.id == None))
    if keyword is not None and len(keyword) > 0:
        query = query.filter(
            or_(
                models.document.Document.title.like(f'%{keyword}%'),
                models.document.Document.description.like(f'%{keyword}%')
            )
        )
    if label_ids is not None:
        query = query.filter(models.document.DocumentLabel.delete_at == None,
                             models.document.DocumentLabel.label_id.in_(label_ids))
    if desc:
        query = query.order_by(models.document.Document.id.desc())
    else:
        query = query.order_by(models.document.Document.id.asc())
    if start is not None:
        if desc:
            query = query.filter(models.document.Document.id <= start)
        else:
            query = query.filter(models.document.Document.id >= start)
    query = query.options(selectinload(models.document.Document.creator))
    query = query.distinct(models.document.Document.id)
    query = query.limit(limit)
    return query.all()

def search_next_user_unread_document(db: Session, 
                                     user_id: int, 
                                     document: models.document.Document, 
                                     keyword: str | None = None,
                                     label_ids: list[int] | None = None,
                                     desc: bool = True):
    query = db.query(models.document.Document)
    query = query.join(models.document.UserDocument).outerjoin(models.document.ReadDocument).outerjoin(models.document.DocumentLabel)
    query = query.filter(models.document.UserDocument.user_id == user_id,
                         models.document.Document.delete_at == None)
    # 过滤没有对应的ReadDocument记录的文档
    query = query.filter(or_(models.document.ReadDocument.delete_at != None, 
                             models.document.ReadDocument.id == None))
    if keyword is not None and len(keyword) > 0:
        query = query.filter(
            or_(
                models.document.Document.title.like(f'%{keyword}%'),
                models.document.Document.description.like(f'%{keyword}%')
            )
        )
    if label_ids is not None:
        query = query.filter(models.document.DocumentLabel.delete_at == None,
                             models.document.DocumentLabel.label_id.in_(label_ids))
    if desc:
        query = query.order_by(models.document.Document.id.desc())
        query = query.filter(models.document.Document.id < document.id)
    else:
        query = query.order_by(models.document.Document.id.asc())
        query = query.filter(models.document.Document.id > document.id)
    return query.first()

def count_user_unread_documents(db: Session, 
                                user_id: int, 
                                keyword: str | None = None, 
                                label_ids: list[int] | None = None):
    query = db.query(models.document.Document)
    query = query.join(models.document.UserDocument).outerjoin(models.document.ReadDocument).outerjoin(models.document.DocumentLabel)
    query = query.filter(models.document.UserDocument.user_id == user_id,
                         models.document.Document.delete_at == None)
    # 过滤没有对应的ReadDocument记录的文档
    query = query.filter(or_(models.document.ReadDocument.delete_at != None, 
                             models.document.ReadDocument.id == None))
    if keyword is not None and len(keyword) > 0:
        query = query.filter(
            or_(
                models.document.Document.title.like(f'%{keyword}%'),
                models.document.Document.description.like(f'%{keyword}%')
            )
        )
    if label_ids is not None:
        query = query.filter(models.document.DocumentLabel.delete_at == None,
                             models.document.DocumentLabel.label_id.in_(label_ids))
    query = query.distinct(models.document.Document.id)
    return query.count()

def search_user_recent_read_documents(db: Session, 
                                      user_id: int, 
                                      start: int | None = None, 
                                      limit: int = 10, 
                                      keyword: str | None = None,
                                      label_ids: list[int] | None = None,
                                      desc: bool = True):
    query = db.query(models.document.Document)
    query = query.join(models.document.ReadDocument).outerjoin(models.document.DocumentLabel)
    query = query.filter(models.document.ReadDocument.delete_at == None,
                         models.document.ReadDocument.user_id == user_id,
                         models.document.Document.delete_at == None)
    if keyword is not None and len(keyword) > 0:
        query = query.filter(
            or_(
                models.document.Document.title.like(f'%{keyword}%'),
                models.document.Document.description.like(f'%{keyword}%')
            )
        )
    if label_ids is not None:
        query = query.filter(models.document.DocumentLabel.delete_at == None,
                             models.document.DocumentLabel.label_id.in_(label_ids))
    if desc:
        query = query.order_by(models.document.Document.id.desc())
    else:
        query = query.order_by(models.document.Document.id.asc())
    if start is not None:
        if desc:
            query = query.filter(models.document.Document.id <= start)
        else:
            query = query.filter(models.document.Document.id >= start)
    query = query.options(selectinload(models.document.Document.creator))
    query = query.distinct(models.document.Document.id)
    query = query.limit(limit)
    return query.all()

def search_next_user_recent_read_document(db: Session, 
                                          user_id: int, 
                                          document: models.document.Document, 
                                          keyword: str | None = None,
                                          label_ids: list[int] | None = None,
                                          desc: bool = True):
    query = db.query(models.document.Document)
    query = query.join(models.document.ReadDocument).outerjoin(models.document.DocumentLabel)
    query = query.filter(models.document.ReadDocument.delete_at == None,
                         models.document.ReadDocument.user_id == user_id,
                         models.document.Document.delete_at == None)
    if keyword is not None and len(keyword) > 0:
        query = query.filter(
            or_(
                models.document.Document.title.like(f'%{keyword}%'),
                models.document.Document.description.like(f'%{keyword}%')
            )
        )
    if label_ids is not None:
        query = query.filter(models.document.DocumentLabel.delete_at == None,
                             models.document.DocumentLabel.label_id.in_(label_ids))
    if desc:
        query = query.order_by(models.document.Document.id.desc())
        query = query.filter(models.document.Document.id < document.id)
    else:
        query = query.order_by(models.document.Document.id.asc())
        query = query.filter(models.document.Document.id > document.id)
    return query.first()

def count_user_recent_read_documents(db: Session,
                                     user_id: int, 
                                     keyword: str | None = None,
                                     label_ids: list[int] | None = None):
    query = db.query(models.document.Document)
    query = query.join(models.document.ReadDocument).outerjoin(models.document.DocumentLabel)
    query = query.filter(models.document.ReadDocument.delete_at == None,
                         models.document.ReadDocument.user_id == user_id,
                         models.document.Document.delete_at == None)
    if keyword is not None and len(keyword) > 0:
        query = query.filter(
            or_(
                models.document.Document.title.like(f'%{keyword}%'),
                models.document.Document.description.like(f'%{keyword}%')
            )
        )
    if label_ids is not None:
        query = query.filter(models.document.DocumentLabel.delete_at == None,
                             models.document.DocumentLabel.label_id.in_(label_ids))
    query = query.distinct(models.document.Document.id)
    return query.count()

def search_user_stared_documents(db: Session, 
                                 user_id: int, 
                                 start: int | None = None, 
                                 limit: int = 10, 
                                 keyword: str | None = None,
                                 label_ids: list[int] | None = None,
                                 desc: bool = True):
    query = db.query(models.document.Document)
    query = query.join(models.document.StarDocument).outerjoin(models.document.DocumentLabel)
    query = query.filter(models.document.StarDocument.delete_at == None,
                         models.document.StarDocument.user_id == user_id,
                         models.document.Document.delete_at == None)
    if keyword is not None and len(keyword) > 0:
        query = query.filter(
            or_(
                models.document.Document.title.like(f'%{keyword}%'),
                models.document.Document.description.like(f'%{keyword}%')
            )
        )
    if label_ids is not None:
        query = query.filter(models.document.DocumentLabel.delete_at == None,
                             models.document.DocumentLabel.label_id.in_(label_ids))
    if desc:
        query = query.order_by(models.document.Document.id.desc())
    else:
        query = query.order_by(models.document.Document.id.asc())
    if start is not None:
        if desc:
            query = query.filter(models.document.Document.id <= start)
        else:
            query = query.filter(models.document.Document.id >= start)
    query = query.options(selectinload(models.document.Document.creator))
    query = query.distinct(models.document.Document.id)
    query = query.limit(limit)
    return query.all()

def search_next_user_star_document(db: Session, 
                                   user_id: int, 
                                   document: models.document.Document, 
                                   keyword: str | None = None,
                                   label_ids: list[int] | None = None,
                                   desc: bool = True):
    query = db.query(models.document.Document)
    query = query.join(models.document.StarDocument).outerjoin(models.document.DocumentLabel)
    query = query.filter(models.document.StarDocument.delete_at == None,
                         models.document.StarDocument.user_id == user_id,
                         models.document.Document.delete_at == None)
    if keyword is not None and len(keyword) > 0:
        query = query.filter(
            or_(
                models.document.Document.title.like(f'%{keyword}%'),
                models.document.Document.description.like(f'%{keyword}%')
            )
        )
    if label_ids is not None:
        query = query.filter(models.document.DocumentLabel.delete_at == None,
                             models.document.DocumentLabel.label_id.in_(label_ids))
    if desc:
        query = query.order_by(models.document.Document.id.desc())
        query = query.filter(models.document.Document.id < document.id)
    else:
        query = query.order_by(models.document.Document.id.asc())
        query = query.filter(models.document.Document.id > document.id)
    return query.first()

def count_user_stared_documents(db: Session, 
                                user_id: int, 
                                keyword: str | None = None,
                                label_ids: list[int] | None = None):
    query = db.query(models.document.Document)
    query = query.join(models.document.StarDocument).outerjoin(models.document.DocumentLabel)
    query = query.filter(models.document.StarDocument.delete_at == None,
                         models.document.StarDocument.user_id == user_id,
                         models.document.Document.delete_at == None)
    if label_ids is not None:
        query = query.filter(models.document.DocumentLabel.delete_at == None,
                             models.document.DocumentLabel.label_id.in_(label_ids))
    if keyword is not None and len(keyword) > 0:
        query = query.filter(
            or_(
                models.document.Document.title.like(f'%{keyword}%'),
                models.document.Document.description.like(f'%{keyword}%')
            )
        )
    query = query.distinct(models.document.Document.id)
    return query.count()

def star_document_by_document_id(db: Session, 
                                 user_id: int,
                                 document_id: int):
    db_exist_star_document = db.query(models.document.StarDocument)\
        .filter(models.document.StarDocument.document_id == document_id,
                models.document.StarDocument.user_id == user_id)\
        .one_or_none()
    if db_exist_star_document is None:    
        db_star_document = models.document.StarDocument(document_id=document_id, 
                                                        user_id=user_id)
        db.add(db_star_document)
        db.flush()
        return db_star_document
    else:
        db_exist_star_document.delete_at = None
        db.flush()
        return db_exist_star_document

def unstar_document_by_document_id(db: Session, 
                                   document_id: int, 
                                   user_id: int):
    now = datetime.now(timezone.utc)
    db_exist_star_document = db.query(models.document.StarDocument)\
        .filter(models.document.StarDocument.document_id == document_id,
                models.document.StarDocument.user_id == user_id)\
        .one_or_none()
    if db_exist_star_document is not None:
        db_exist_star_document.delete_at = now
        db.flush()
        return db_exist_star_document
    
def read_document_by_document_id(db: Session, 
                                 user_id: int,
                                 document_id: int):
    now = datetime.now(timezone.utc)
    db_exist_read_document = db.query(models.document.ReadDocument)\
        .filter(models.document.ReadDocument.document_id == document_id,
                models.document.ReadDocument.user_id == user_id)\
        .one_or_none()
    if db_exist_read_document is None:
        db_read_document = models.document.ReadDocument(document_id=document_id, 
                                                        user_id=user_id, 
                                                        read_time=now)
        db.add(db_read_document)
        db.flush()
        return db_read_document
    else:
        db_exist_read_document.delete_at = None
        db.flush()
        return db_exist_read_document

def unread_document_by_document_id(db: Session, 
                                   user_id: int,
                                   document_id: int):
    now = datetime.now(timezone.utc)
    db_exist_read_document = db.query(models.document.ReadDocument)\
        .filter(models.document.ReadDocument.document_id == document_id,
                models.document.ReadDocument.user_id == user_id)\
        .one_or_none()
    if db_exist_read_document is not None:
        db_exist_read_document.delete_at = now
        db.flush()
        return db_exist_read_document

def delete_labels_by_label_ids(db: Session, 
                               user_id: int,
                               label_ids: list[int]):
    now = datetime.now(timezone.utc)
    query = db.query(models.document.Label)
    query = query.filter(models.document.Label.id.in_(label_ids),
                         models.document.Label.user_id == user_id,
                         models.document.Label.delete_at == None)
    query = query.update({models.document.Label.delete_at: now}, synchronize_session=False)
    db.flush()

def delete_document_labels_by_label_ids(db: Session, 
                                        label_ids: list[int]):
    now = datetime.now(timezone.utc)
    query = db.query(models.document.DocumentLabel)
    query = query.filter(models.document.DocumentLabel.label_id.in_(label_ids), 
                         models.document.DocumentLabel.delete_at == None)
    query = query.update({models.document.DocumentLabel.delete_at: now})
    db.flush()

def delete_user_documents_by_document_ids(db: Session, 
                                          document_ids: list[int], 
                                          user_id: int):
    now = datetime.now(timezone.utc)
    
    # 需要按照用户过滤，非该用户id的不允许删除
    # 结果是元组数组[(15,)]
    db_document_ids = db.query(models.document.Document.id) \
        .join(models.document.UserDocument) \
        .filter(models.document.Document.id.in_(document_ids),
                models.document.UserDocument.user_id == user_id,
                models.document.UserDocument.delete_at == None,
                models.document.UserDocument.authority == UserDocumentAuthority.OWNER) \
        .all()
        
    ids_to_update = [id[0] for id in db_document_ids]

    db.query(models.document.Document)\
        .filter(models.document.Document.id.in_(ids_to_update),
                models.document.Document.delete_at == None)\
        .update({models.document.Document.delete_at: now}, synchronize_session=False)
    
    db.query(models.document.WebsiteDocument)\
        .filter(models.document.WebsiteDocument.document_id.in_(ids_to_update),
                models.document.WebsiteDocument.delete_at == None)\
        .update({models.document.WebsiteDocument.delete_at: now}, synchronize_session=False)

    db.query(models.document.FileDocument)\
        .filter(models.document.FileDocument.document_id.in_(ids_to_update),
                models.document.FileDocument.delete_at == None)\
        .update({models.document.FileDocument.delete_at: now}, synchronize_session=False)
    
    db.query(models.document.QuickNoteDocument)\
        .filter(models.document.QuickNoteDocument.document_id.in_(ids_to_update),
                models.document.QuickNoteDocument.delete_at == None)\
        .update({models.document.QuickNoteDocument.delete_at: now}, synchronize_session=False)
    
    db.query(models.document.UserDocument)\
        .filter(models.document.UserDocument.document_id.in_(ids_to_update),
                models.document.UserDocument.delete_at == None)\
        .update({models.document.UserDocument.delete_at: now}, synchronize_session=False)
        
    db.query(models.document.DocumentLabel)\
        .filter(models.document.DocumentLabel.document_id.in_(ids_to_update),
                models.document.DocumentLabel.delete_at == None)\
        .update({models.document.DocumentLabel.delete_at: now}, synchronize_session=False)
        
    db.query(models.document.StarDocument)\
        .filter(models.document.StarDocument.document_id.in_(ids_to_update),
                models.document.StarDocument.delete_at == None)\
        .update({models.document.StarDocument.delete_at: now}, synchronize_session=False)
    
    db.query(models.document.ReadDocument)\
        .filter(models.document.ReadDocument.document_id.in_(ids_to_update),
                models.document.ReadDocument.delete_at == None)\
        .update({models.document.ReadDocument.delete_at: now}, synchronize_session=False)
        
    db.query(models.document.DocumentNote)\
        .filter(models.document.DocumentNote.document_id.in_(ids_to_update),
                models.document.DocumentNote.delete_at == None)\
        .update({models.document.DocumentNote.delete_at: now}, synchronize_session=False)
        
    db.query(models.document.DocumentPodcast)\
        .filter(models.document.DocumentPodcast.document_id.in_(ids_to_update),
                models.document.DocumentPodcast.delete_at == None)\
        .update({models.document.DocumentPodcast.delete_at: now}, synchronize_session=False)
        
    db.query(models.section.SectionDocument)\
        .filter(models.section.SectionDocument.document_id.in_(ids_to_update),
                models.section.SectionDocument.delete_at == None)\
        .update({models.section.SectionDocument.delete_at: now}, synchronize_session=False)

    db.flush()
    
def delete_document_notes_by_user_id_and_note_ids(db: Session, 
                                                  user_id: int, 
                                                  note_ids: list[int]):
    now = datetime.now(timezone.utc)
    query = db.query(models.document.DocumentNote)
    query = query.filter(models.document.DocumentNote.note_id.in_(note_ids), 
                         models.document.DocumentNote.user_id == user_id,
                         models.document.DocumentNote.delete_at == None)
    query = query.update({models.document.DocumentNote.delete_at: now})
    db.flush()
    
def delete_website_document_by_website_document_ids(db: Session, 
                                                    user_id: int,
                                                    website_document_ids: list[int]):
    now = datetime.now(timezone.utc)
    
    # 安全起见，此处过滤掉非用户的文档
    db_website_documents = db.query(models.document.WebsiteDocument)\
        .join(models.document.UserDocument, models.document.WebsiteDocument.document_id == models.document.UserDocument.document_id)\
        .filter(models.document.WebsiteDocument.id.in_(website_document_ids),
                models.document.WebsiteDocument.delete_at == None,
                models.document.UserDocument.user_id == user_id,
                models.document.UserDocument.authority == UserDocumentAuthority.OWNER)\
        .all()
        
    db_website_document_ids = [website_document.id for website_document in db_website_documents]
    
    db.query(models.document.WebsiteDocument)\
        .filter(models.document.WebsiteDocument.id.in_(db_website_document_ids),
                models.document.WebsiteDocument.delete_at == None)\
        .update({models.document.WebsiteDocument.delete_at: now}, synchronize_session=False)

    db.flush()
        
def delete_document_podcast_by_document_ids(db: Session, 
                                            user_id: int,
                                            document_ids: list[int]):
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