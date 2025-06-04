import models
from datetime import datetime, timezone
from sqlalchemy.orm import Session

def create_website_crawling_engine(db: Session, 
                                   user_id: int, 
                                   name: str,
                                   description: str):
    now = datetime.now(timezone.utc)
    db_website_crawling_engine = models.engine.WebsiteCarwingEngine(name=name, 
                                                                    description=description,
                                                                    create_time=now,
                                                                    update_time=now)
    db.add(db_website_crawling_engine)
    db.flush()
    return db_website_crawling_engine

def create_document_parsing_engine(db: Session, 
                                   user_id: int, 
                                   name: str,
                                   description: str):
    now = datetime.now(timezone.utc)
    db_document_parsing_engine = models.engine.DocumentParsingEngine(name=name, 
                                                                     description=description,
                                                                     create_time=now,
                                                                     update_time=now)
    db.add(db_document_parsing_engine)
    db.flush()
    return db_document_parsing_engine

def create_user_website_crawling_engine(db: Session, 
                                        user_id: int, 
                                        website_crawling_engine_id: int):
    now = datetime.now(timezone.utc)
    db_user_website_crawling_engine = models.engine.UserWebsiteCarwingEngine(user_id=user_id,
                                                                             website_crawling_engine_id=website_crawling_engine_id,
                                                                             create_time=now,
                                                                             update_time=now)
    db.add(db_user_website_crawling_engine)
    db.flush()
    return db_user_website_crawling_engine

def create_user_document_parsing_engine(db: Session,
                                        user_id: int,
                                        document_parsing_engine_id: int):
    now = datetime.now(timezone.utc)
    db_user_document_parsing_engine = models.engine.UserDocumentParsingEngine(user_id=user_id,
                                                                              document_parsing_engine_id=document_parsing_engine_id,
                                                                              create_time=now,
                                                                              update_time=now)
    db.add(db_user_document_parsing_engine)
    db.flush()
    return db_user_document_parsing_engine

def get_website_crawling_engine_by_id(db: Session, website_crawling_engine_id: int):
    query = db.query(models.engine.WebsiteCarwingEngine)
    query = query.filter(models.engine.WebsiteCarwingEngine.id == website_crawling_engine_id,
                         models.engine.WebsiteCarwingEngine.delete_at == False)
    return query.first()

def get_document_parsing_engine_by_id(db: Session, document_parsing_engine_id: int):
    query = db.query(models.engine.DocumentParsingEngine)
    query = query.filter(models.engine.DocumentParsingEngine.id == document_parsing_engine_id,
                         models.engine.DocumentParsingEngine.delete_at == False)
    return query.first()

def get_website_crawling_engine_by_user_id(db: Session, user_id: int):
    query = db.query(models.engine.WebsiteCarwingEngine)
    query = query.join(models.engine.UserWebsiteCarwingEngine)
    query = query.filter(models.engine.UserWebsiteCarwingEngine.user_id == user_id,
                         models.engine.UserWebsiteCarwingEngine.delete_at == False)
    return query.all()

def get_document_parsing_engine_by_user_id(db: Session, user_id: int):
    query = db.query(models.engine.DocumentParsingEngine)
    query = query.join(models.engine.UserDocumentParsingEngine)
    query = query.filter(models.engine.UserDocumentParsingEngine.user_id == user_id,
                         models.engine.UserDocumentParsingEngine.delete_at == False)
    return query.all()

def delete_website_crawling_engine(db: Session, website_crawling_engine_id: int):
    now = datetime.now(timezone.utc)
    db.query(models.engine.WebsiteCarwingEngine)\
        .filter(models.engine.WebsiteCarwingEngine.id == website_crawling_engine_id,
                models.engine.WebsiteCarwingEngine.delete_at == False)\
            .update({models.engine.WebsiteCarwingEngine.delete_at: now})
    db.commit()
    
def delete_document_parsing_engine(db: Session, document_parsing_engine_id: int):
    now = datetime.now(timezone.utc)
    db.query(models.engine.DocumentParsingEngine)\
        .filter(models.engine.DocumentParsingEngine.id == document_parsing_engine_id,
                models.engine.DocumentParsingEngine.delete_at == False)\
            .update({models.engine.DocumentParsingEngine.delete_at: now})
    db.commit()
    
def delete_user_website_crawling_engine(db: Session, user_id: int, website_crawling_engine_id: int):
    now = datetime.now(timezone.utc)
    db.query(models.engine.UserWebsiteCarwingEngine)\
        .filter(models.engine.UserWebsiteCarwingEngine.user_id == user_id,
                models.engine.UserWebsiteCarwingEngine.website_crawling_engine_id == website_crawling_engine_id,
                models.engine.UserWebsiteCarwingEngine.delete_at == False)\
            .update({models.engine.UserWebsiteCarwingEngine.delete_at: now})
    db.commit()
    
def delete_user_document_parsing_engine(db: Session, user_id: int, document_parsing_engine_id: int):
    now = datetime.now(timezone.utc)
    db.query(models.engine.UserDocumentParsingEngine)\
        .filter(models.engine.UserDocumentParsingEngine.user_id == user_id,
                models.engine.UserDocumentParsingEngine.document_parsing_engine_id == document_parsing_engine_id,
                models.engine.UserDocumentParsingEngine.delete_at == False)\
            .update({models.engine.UserDocumentParsingEngine.delete_at: now})
    db.commit()