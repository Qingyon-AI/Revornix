import models
from datetime import datetime, timezone
from sqlalchemy.orm import Session

def get_file_system_by_id(
    db: Session, 
    file_system_id: int
):
    query = db.query(models.file_system.FileSystem)
    query = query.filter(models.file_system.FileSystem.id == file_system_id,
                         models.file_system.FileSystem.delete_at == None)
    return query.one_or_none()

def get_user_file_system_by_id(
    db: Session, 
    user_file_system_id: int
):
    query = db.query(models.file_system.UserFileSystem)
    query = query.join(models.file_system.FileSystem)
    query = query.filter(models.file_system.UserFileSystem.id == user_file_system_id,
                         models.file_system.UserFileSystem.delete_at == None,
                         models.file_system.FileSystem.delete_at == None)
    return query.one_or_none()
    
def delete_user_file_system_by_user_id_and_user_file_system_id(
    db: Session, 
    user_id: int, 
    user_file_system_id: int
):
    now = datetime.now(timezone.utc)
    query = db.query(models.file_system.UserFileSystem)
    query = query.filter(models.file_system.UserFileSystem.id == user_file_system_id,
                         models.file_system.UserFileSystem.delete_at == None,
                         models.file_system.UserFileSystem.user_id == user_id)
    query.update({models.file_system.UserFileSystem.delete_at: now})
    db.flush()