import models
from datetime import datetime, timezone
from sqlalchemy.orm import Session

def create_engine(db: Session, 
                  name: str,
                  description: str):
    now = datetime.now(timezone.utc)
    db_engine = models.engine.Engine(name=name, 
                                     description=description,
                                     create_time=now,
                                     update_time=now)
    db.add(db_engine)
    db.flush()
    return db_engine

def create_user_engine(db: Session, 
                       user_id: int, 
                       engine_id: int):
    now = datetime.now(timezone.utc)
    db_user_engine = models.engine.UserEngine(user_id=user_id,
                                              engine_id=engine_id,
                                              create_time=now,
                                              update_time=now,
                                              enable=True)
    db.add(db_user_engine)
    db.flush()
    return db_user_engine

def get_engine_by_id(db: Session, id: int):
    query = db.query(models.engine.Engine)
    query = query.filter(models.engine.Engine.id == id,
                         models.engine.Engine.delete_at == None)
    return query.first()

def get_user_engine_by_user_id_and_engine_id(db: Session, user_id: int, engine_id: int):
    query = db.query(models.engine.UserEngine)
    query = query.filter(models.engine.UserEngine.user_id == user_id,
                         models.engine.UserEngine.engine_id == engine_id,
                         models.engine.UserEngine.delete_at == None)
    return query.first()

def get_all_engines(db: Session, keyword: str | None = None):
    query = db.query(models.engine.Engine)
    query = query.filter(models.engine.Engine.delete_at == None)
    if keyword is not None and len(keyword) > 0:
        query = query.filter(models.engine.Engine.name.like(f'%{keyword}%'))
    return query.all()

def get_engine_by_user_id(db: Session, user_id: int, keyword: str | None = None):
    query = db.query(models.engine.Engine)
    query = query.join(models.engine.UserEngine)
    query = query.filter(models.engine.UserEngine.user_id == user_id,
                         models.engine.UserEngine.delete_at == None,
                         models.engine.Engine.delete_at == None)
    if keyword is not None and len(keyword) > 0:
        query = query.filter(models.engine.Engine.name.like(f'%{keyword}%'))
    return query.all()

def delete_engine(db: Session, engine_id: int):
    now = datetime.now(timezone.utc)
    db.query(models.engine.Engine)\
        .filter(models.engine.Engine.id == engine_id,
                models.engine.Engine.delete_at == None)\
            .update({models.engine.Engine.delete_at: now})
    db.commit()
    
def delete_user_engine(db: Session, user_id: int, engine_id: int):
    now = datetime.now(timezone.utc)
    db.query(models.engine.UserEngine)\
        .filter(models.engine.UserEngine.user_id == user_id,
                models.engine.UserEngine.engine_id == engine_id,
                models.engine.UserEngine.delete_at == None)\
            .update({models.engine.Engine.delete_at: now})
    db.commit()