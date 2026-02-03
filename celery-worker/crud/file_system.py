import models
from datetime import datetime, timezone
from sqlalchemy.orm import Session

def get_file_system_by_id(
    db: Session, 
    file_system_id: int
):
    query = db.query(models.file_system.FileSystem)
    query = query.filter(models.file_system.FileSystem.id == file_system_id,
                         models.file_system.FileSystem.delete_at.is_(None))
    return query.one_or_none()

def get_user_file_system_by_id(
    db: Session, 
    user_file_system_id: int
):
    query = db.query(models.file_system.UserFileSystem)
    query = query.join(models.file_system.FileSystem)
    query = query.filter(models.file_system.UserFileSystem.id == user_file_system_id,
                         models.file_system.UserFileSystem.delete_at.is_(None),
                         models.file_system.FileSystem.delete_at.is_(None))
    return query.one_or_none()