import models
from sqlalchemy.orm import Session
from enums.user import UserRole

def get_user_by_uuid(
    db: Session,
    uuid: str
):
    query = db.query(models.user.User)
    query = query.filter(models.user.User.uuid == uuid, 
                         models.user.User.delete_at.is_(None))
    return query.one_or_none()

def get_user_by_id(
    db: Session,
    user_id: int
):
    query = db.query(models.user.User)
    query = query.filter(models.user.User.id == user_id,
                         models.user.User.delete_at.is_(None))
    return query.one_or_none()


def get_root_user(
    db: Session
):
    query = db.query(models.user.User)
    query = query.filter(
        models.user.User.role == UserRole.ROOT,
        models.user.User.delete_at.is_(None)
    )
    return query.one_or_none()