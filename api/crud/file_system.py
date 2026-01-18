from datetime import datetime, timezone

from sqlalchemy.orm import Session

import models


def create_file_system(
    db: Session,
    uuid: str,
    name: str,
    name_zh: str,
    description: str | None = None,
    description_zh: str | None = None,
    demo_config: str | None = None
):
    now = datetime.now(timezone.utc)
    db_file_system = models.file_system.FileSystem(uuid=uuid,
                                                   name=name,
                                                   name_zh=name_zh,
                                                   description=description,
                                                   description_zh=description_zh,
                                                   demo_config=demo_config,
                                                   create_time=now)
    db.add(db_file_system)
    db.flush()
    return db_file_system

def create_user_file_system(
    db: Session,
    user_id: int,
    file_system_id: int,
    title: str | None = None,
    description: str | None = None,
    config_json: str | None = None
):
    now = datetime.now(timezone.utc)
    db_file_system_user = models.file_system.UserFileSystem(file_system_id=file_system_id,
                                                            user_id=user_id,
                                                            title=title,
                                                            description=description,
                                                            config_json=config_json,
                                                            create_time=now)
    db.add(db_file_system_user)
    db.flush()
    return db_file_system_user

def get_all_file_systems(
    db: Session,
    keyword: str | None = None
):
    query = db.query(models.file_system.FileSystem)
    query = query.filter(models.file_system.FileSystem.delete_at == None)
    if keyword is not None and len(keyword) > 0:
        query = query.filter(models.file_system.FileSystem.name.like(f'%{keyword}%'))
    return query.all()

def get_file_system_by_uuid(
    db: Session,
    uuid: str
):
    query = db.query(models.file_system.FileSystem)
    query = query.filter(models.file_system.FileSystem.uuid == uuid,
                         models.file_system.FileSystem.delete_at == None)
    return query.one_or_none()

def get_user_file_systems_by_user_id(
    db: Session,
    user_id: int,
    keyword: str | None = None
):
    query = db.query(models.file_system.UserFileSystem, models.file_system.FileSystem)
    query = query.join(models.file_system.FileSystem)
    query = query.filter(models.file_system.UserFileSystem.user_id == user_id,
                         models.file_system.UserFileSystem.delete_at == None,
                         models.file_system.FileSystem.delete_at == None)
    if keyword is not None and len(keyword) > 0:
        query = query.filter(models.file_system.FileSystem.name.like(f'%{keyword}%'))
    query = query.order_by(models.file_system.UserFileSystem.create_time)
    return query.all()

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
