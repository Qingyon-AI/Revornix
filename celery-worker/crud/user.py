import models
from sqlalchemy.orm import Session

def get_user_by_id(db: Session,
                   user_id: int):
    query = db.query(models.user.User)
    query = query.filter(models.user.User.id == user_id,
                         models.user.User.delete_at == None)
    return query.first()

def get_email_user_by_user_id(db: Session,
                              user_id: int):
    query = db.query(models.user.EmailUser)
    query = query.join(models.user.User)
    query = query.filter(models.user.EmailUser.user_id == user_id,
                        models.user.EmailUser.delete_at == None,
                        models.user.User.delete_at == None)
    return query.first()
