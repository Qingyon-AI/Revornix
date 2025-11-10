import models
from sqlalchemy.orm import Session

def get_engine_by_id(db: Session, id: int):
    query = db.query(models.engine.Engine)
    query = query.filter(models.engine.Engine.id == id,
                         models.engine.Engine.delete_at == None)
    return query.one_or_none()

def get_user_engine_by_user_engine_id(db: Session, user_engine_id: int):
    query = db.query(models.engine.UserEngine)
    query = query.filter(models.engine.UserEngine.id == user_engine_id,
                         models.engine.UserEngine.delete_at == None)
    return query.one_or_none()