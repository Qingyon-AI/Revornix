import models
from datetime import datetime, timezone
from sqlalchemy.orm import Session

def create_api_key(db: Session, 
                   user_id: int, 
                   api_key: str, 
                   description: str):
    now = datetime.now(timezone.utc)
    db_api_key = models.api_key.ApiKey(user_id=user_id, 
                                       api_key=api_key, 
                                       description=description,
                                       create_time=now)
    db.add(db_api_key)
    db.flush()
    return db_api_key

def get_api_key_by_id(db: Session, 
                      api_key_id: int):
    query = db.query(models.api_key.ApiKey)
    query = query.filter(models.api_key.ApiKey.id == api_key_id,
                         models.api_key.ApiKey.delete_at == None)
    return query.first()

def get_api_key_by_api_key(db: Session, 
                           api_key: str):
    query = db.query(models.api_key.ApiKey)
    query = query.filter(models.api_key.ApiKey.api_key == api_key,
                         models.api_key.ApiKey.delete_at == None)
    return query.first()

def count_user_api_key(db: Session, 
                       user_id: int, 
                       keyword: str | None = None):
    query = db.query(models.api_key.ApiKey)
    query = query.filter(models.api_key.ApiKey.user_id == user_id,
                         models.api_key.ApiKey.delete_at == None)
    if keyword is not None and len(keyword) > 0:
        query = query.filter(models.api_key.ApiKey.description.like(f"%{keyword}%"))
    return query.count()

def search_api_key(db: Session, 
                   user_id: int, 
                   page_num: int, 
                   page_size : int = 10,
                   keyword: str | None = None):
    query = db.query(models.api_key.ApiKey)
    query = query.filter(models.api_key.ApiKey.user_id == user_id, 
                         models.api_key.ApiKey.delete_at == None)
    if keyword is not None and len(keyword) > 0:
        query = query.filter(models.api_key.ApiKey.description.like(f"%{keyword}%"))
    query = query.order_by(models.api_key.ApiKey.create_time.desc())
    query = query.offset((page_num - 1) * page_size)
    query = query.limit(page_size)
    return query.all()

def get_user_by_api_key(db: Session, 
                        api_key: str):
    query = db.query(models.user.User)
    query = query.join(models.api_key.ApiKey)
    query = query.filter(models.api_key.ApiKey.api_key == api_key,
                         models.api_key.ApiKey.delete_at == None)
    return query.first()

def delete_all_api_keys_by_user_id(db: Session, 
                                   user_id: int):
    delete_time = datetime.now(timezone.utc)
    query = db.query(models.api_key.ApiKey)
    query = query.filter(models.api_key.ApiKey.user_id == user_id,
                         models.api_key.ApiKey.delete_at == None)
    query.update({models.api_key.ApiKey.delete_at: delete_time}, synchronize_session=False)
    db.flush()

def delete_api_keys_by_ids(db: Session, 
                           user_id: int, 
                           api_key_ids: list[int]):
    delete_time = datetime.now(timezone.utc)
    db_api_keys_query = db.query(models.api_key.ApiKey)\
        .filter(models.api_key.ApiKey.user_id == user_id, 
                models.api_key.ApiKey.delete_at == None,
                models.api_key.ApiKey.id.in_(api_key_ids))
    db_api_keys_query.update({models.api_key.ApiKey.delete_at: delete_time}, synchronize_session=False)
    db.flush()