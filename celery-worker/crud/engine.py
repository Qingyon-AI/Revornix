import models
from datetime import datetime, timezone
from sqlalchemy.orm import Session

def create_engine(
    db: Session, 
    uuid: str,
    category: int,
    name: str,
    name_zh: str,
    description: str | None = None,
    description_zh: str | None = None,
    demo_config: str | None = None
):
    now = datetime.now(timezone.utc)
    db_engine = models.engine.Engine(uuid=uuid,
                                     category=category,
                                     name=name, 
                                     name_zh=name_zh,
                                     description=description,
                                     description_zh=description_zh,
                                     demo_config=demo_config,
                                     create_time=now)
    db.add(db_engine)
    db.flush()
    return db_engine
    

def create_user_engine(
    db: Session, 
    user_id: int, 
    engine_id: int,
    title: str,
    description: str | None = None,
    config_json: str | None = None
):
    now = datetime.now(timezone.utc)
    db_user_engine = models.engine.UserEngine(user_id=user_id,
                                              engine_id=engine_id,
                                              title=title,
                                              description=description,
                                              config_json=config_json,
                                              create_time=now,
                                              enable=True)
    db.add(db_user_engine)
    db.flush()
    return db_user_engine

def get_engine_by_uuid(
    db: Session, 
    uuid: str
):
    query = db.query(models.engine.Engine)
    query = query.filter(models.engine.Engine.uuid == uuid,
                         models.engine.Engine.delete_at == None)
    return query.one_or_none()

def get_engine_by_id(
    db: Session, 
    id: int
):
    query = db.query(models.engine.Engine)
    query = query.filter(models.engine.Engine.id == id,
                         models.engine.Engine.delete_at == None)
    return query.one_or_none()

def get_user_engine_by_user_engine_id(
    db: Session, 
    user_engine_id: int
):
    query = db.query(models.engine.UserEngine)
    query = query.filter(models.engine.UserEngine.id == user_engine_id,
                         models.engine.UserEngine.delete_at == None)
    return query.one_or_none()