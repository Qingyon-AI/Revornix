import models
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy import or_

def create_rss_server(db: Session, title: str, description: str, cover: str, address: str, user_id: int):
    now = datetime.now(timezone.utc)
    db_rss_server = models.rss.RSSServer(title=title, 
                                         description=description, 
                                         cover=cover,
                                         address=address,
                                         create_time=now, 
                                         update_time=now,
                                         user_id=user_id)
    db.add(db_rss_server)
    db.flush()
    return db_rss_server

def bind_rss_to_section(db: Session, rss_server_id: int, section_id: int):
    now = datetime.now(timezone.utc)
    db_rss_section = models.rss.RSSSection(rss_server_id=rss_server_id, 
                                           section_id=section_id, 
                                           create_time=now, 
                                           update_time=now)
    db.add(db_rss_section)
    db.flush()
    return db_rss_section

def bind_document_to_rss(db: Session, rss_server_id: int, document_id: int):
    now = datetime.now(timezone.utc)
    db_rss_document = models.rss.RSSDocument(rss_server_id=rss_server_id, 
                                             document_id=document_id, 
                                             create_time=now, 
                                             update_time=now)
    db.add(db_rss_document)
    db.flush()
    return db_rss_document

def get_all_rss_servers(db: Session):
    query = db.query(models.rss.RSSServer)
    query = query.filter(models.rss.RSSServer.delete_at == None)
    return query.all()

def search_rss_documents(db: Session,
                         rss_id: int,
                         start: int | None = None,
                         limit: int = 10,
                         keyword: str | None = None,
                         desc: bool = True):
    query = db.query(models.document.Document)
    query = query.join(models.rss.RSSDocument, models.rss.RSSDocument.document_id == models.document.Document.id)
    query = query.filter(models.rss.RSSDocument.rss_server_id == rss_id,
                         models.rss.RSSDocument.delete_at == None,
                         models.document.Document.delete_at == None)
    if keyword is not None and len(keyword) != 0:
        query = query.filter(or_(models.document.Document.title.like(f'%{keyword}%'),
                                 models.document.Document.description.like(f'%{keyword}%')))
    if desc:
        query = query.order_by(models.document.Document.id.desc())
    else:
        query = query.order_by(models.document.Document.id.asc())
    if start is not None:
        if desc is True:
            query = query.filter(models.document.Document.id <= start)
        else:
            query = query.filter(models.document.Document.id >= start)
    query = query.distinct(models.document.Document.id)
    query = query.limit(limit)
    return query.all()

def search_next_rss_document(db: Session,
                             rss_id: int,
                             document: models.document.Document,
                             keyword: str | None = None,
                             desc: bool = True):
    query = db.query(models.document.Document)
    query = query.join(models.rss.RSSDocument, models.rss.RSSDocument.document_id == models.document.Document.id)
    query = query.filter(models.rss.RSSDocument.rss_server_id == rss_id,
                         models.rss.RSSDocument.delete_at == None,
                         models.document.Document.delete_at == None)
    if keyword is not None and len(keyword) > 0:
        query = query.filter(or_(models.document.Document.title.like(f"%{keyword}%"),
                                 models.document.Document.description.like(f"%{keyword}%")))
    if desc is True:
        query = query.order_by(models.document.Document.id.desc())
    else:
        query = query.order_by(models.document.Document.id.asc())
    
    if desc is True:
        query = query.filter(models.document.Document.id < document.id)
    else:
        query = query.filter(models.document.Document.id > document.id)
    return query.first()

def count_rss_documents(db: Session, rss_id: int, keyword: str | None = None):
    query = db.query(models.document.Document)
    query = query.join(models.rss.RSSDocument, models.rss.RSSDocument.document_id == models.document.Document.id)
    query = query.filter(models.rss.RSSDocument.rss_server_id == rss_id,
                         models.rss.RSSDocument.delete_at == None,
                         models.document.Document.delete_at == None)
    if keyword is not None and len(keyword) > 0:
        query = query.filter(or_(models.document.Document.title.like(f"%{keyword}%"),
                                 models.document.Document.description.like(f"%{keyword}%")))
    query = query.distinct(models.document.Document.id)
    return query.count()

def search_user_rss_servers(db: Session, 
                            user_id: int, 
                            start: int | None = None, 
                            limit: int = 10, 
                            keyword: str | None = None):
    query = db.query(models.rss.RSSServer)
    query = query.filter(models.rss.RSSServer.user_id == user_id,
                         models.rss.RSSServer.delete_at == None)
    if keyword is not None and len(keyword) != 0:
        query = query.filter(or_(models.rss.RSSServer.title.like(f'%{keyword}%'),
                                 models.rss.RSSServer.description.like(f'%{keyword}%')))
    query = query.order_by(models.rss.RSSServer.id.desc())
    if start is not None:
        query = query.filter(models.rss.RSSServer.id <= start)
    query = query.limit(limit)
    return query.all()

def search_next_user_rss_server(db: Session, 
                                user_id: int, 
                                rss_server: models.rss.RSSServer, 
                                keyword: str | None = None):
    query = db.query(models.rss.RSSServer)
    query = query.filter(models.rss.RSSServer.user_id == user_id,
                         models.rss.RSSServer.delete_at == None)
    if keyword is not None and len(keyword) > 0:
        query = query.filter(or_(models.rss.RSSServer.title.like(f"%{keyword}%"),
                                 models.rss.RSSServer.description.like(f"%{keyword}%")))
    query = query.order_by(models.document.Document.id.desc())
    query = query.filter(models.document.Document.id < rss_server.id)
    return query.first()     

def count_user_rss_servers(db: Session, 
                           user_id: int, 
                           keyword: str | None = None):
    query = db.query(models.rss.RSSServer)
    query = query.filter(models.rss.RSSServer.user_id == user_id,
                         models.rss.RSSServer.delete_at == None)
    if keyword is not None and len(keyword) > 0:
        query = query.filter(or_(models.rss.RSSServer.title.like(f'%{keyword}%'),
                                 models.rss.RSSServer.content.like(f'%{keyword}%')))
    return query.count()

def get_sections_by_rss_id(db: Session, rss_server_id: int):
    query = db.query(models.section.Section)
    query = query.join(models.rss.RSSSection)
    query = query.join(models.rss.RSSServer)
    query = query.filter(models.rss.RSSSection.rss_server_id == rss_server_id,
                         models.rss.RSSSection.delete_at == None,
                         models.rss.RSSServer.delete_at == None,
                         models.section.Section.delete_at == None)
    return query.all()

def get_documents_by_rss_id(db: Session, rss_server_id: int):
    query = db.query(models.document.Document)
    query = query.join(models.rss.RSSDocument)
    query = query.join(models.rss.RSSServer)
    query = query.filter(models.rss.RSSDocument.rss_server_id == rss_server_id,
                         models.rss.RSSDocument.delete_at == None,
                         models.rss.RSSServer.delete_at == None,
                         models.document.Document.delete_at == None)
    return query.all()

def get_rss_sections_by_section_id(db: Session, section_id: int):
    query = db.query(models.rss.RSSSection)
    query = query.join(models.rss.RSSServer)
    query = query.filter(models.rss.RSSSection.section_id == section_id,
                         models.rss.RSSSection.delete_at == None,
                         models.rss.RSSServer.delete_at == None)
    return query.all()

def get_rss_server_by_id(db: Session, id: int):
    query = db.query(models.rss.RSSServer)
    query = query.filter(models.rss.RSSServer.id == id,
                         models.rss.RSSServer.delete_at == None)
    return query.first()

def get_rss_server_by_user_id(db: Session, user_id: int):
    query = db.query(models.rss.RSSServer)
    query = query.filter(models.rss.RSSServer.user_id == user_id)
    return query.all()
    
def delete_rss_servers(db: Session, ids: list[int], user_id: int):
    query = db.query(models.rss.RSSServer)
    query = query.filter(models.rss.RSSServer.id.in_(ids),
                         models.rss.RSSServer.delete_at == None,
                         models.rss.RSSServer.user_id == user_id)
    query.update({models.rss.RSSServer.delete_at: datetime.now(timezone.utc)})
    db.flush()
    
def delete_rss_sections(db: Session, ids: list[int], user_id: int):
    db_rss_sections = db.query(models.rss.RSSSection) \
            .join(models.rss.RSSServer) \
            .filter(models.rss.RSSSection.id.in_(ids),
                    models.rss.RSSSection.delete_at == None,
                    models.rss.RSSServer.user_id == user_id) \
            .all()
    db_rss_section_ids = [id[0] for id in db_rss_sections]
    db.query(models.rss.RSSSection) \
        .filter(models.rss.RSSSection.id.in_(db_rss_section_ids)) \
        .update({models.rss.RSSSection.delete_at: datetime.now(timezone.utc)})
    db.flush()