import models
from sqlalchemy.orm import Session

def get_user_by_id(
    db: Session,
    user_id: int
):
    query = db.query(models.user.User)
    query = query.filter(models.user.User.id == user_id,
                         models.user.User.delete_at == None)
    return query.one_or_none()