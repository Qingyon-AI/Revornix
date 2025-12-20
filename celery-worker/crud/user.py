import models
from sqlalchemy.orm import Session

def get_user_by_uuid(
    db: Session,
    user_uuid: str
):
    query = db.query(models.user.User)
    query = query.filter(models.user.User.uuid == user_uuid, 
                         models.user.User.delete_at == None)
    return query.one_or_none()

def get_user_by_id(
    db: Session,
    user_id: int
):
    query = db.query(models.user.User)
    query = query.filter(models.user.User.id == user_id,
                         models.user.User.delete_at == None)
    return query.one_or_none()