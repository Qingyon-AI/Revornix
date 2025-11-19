import models
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy import or_

def create_notification_task_content_custom(
    db: Session, 
    notification_task_id: int,
    title: str,
    content: str | None = None
):
    db_notification_task_content_custom = models.notification.NotificationTaskContentCustom(notification_task_id=notification_task_id,
                                                                                            title=title,
                                                                                            content=content)
    db.add(db_notification_task_content_custom)
    db.flush()
    return db_notification_task_content_custom

def create_notification_task_content_template(
    db: Session,
    notification_task_id: int,
    notification_template_id: int
):
    db_notification_task_content_tmeplate = models.notification.NotificationTaskContentTemplate(notification_task_id=notification_task_id,
                                                                                             notification_template_id=notification_template_id)
    db.add(db_notification_task_content_tmeplate)
    db.flush()
    return db_notification_task_content_tmeplate

def create_notification_task(
    db: Session, 
    user_id: int,
    notification_content_type: int,
    notification_source_id: int,
    notification_target_id: int,
    enable: bool,
    trigger_cron_expr: str | None = None,
):
    now = datetime.now(timezone.utc)
    notification_task = models.notification.NotificationTask(user_id=user_id,
                                                             notification_content_type=notification_content_type,
                                                             notification_source_id=notification_source_id,
                                                             notification_target_id=notification_target_id,
                                                             trigger_cron_expr=trigger_cron_expr,
                                                             create_time=now,
                                                             enable=enable)
    db.add(notification_task)
    db.flush()
    return notification_task

def create_notification_target(
    db: Session,
    creator_id: int,
    category: int,
    title: str,
    description: str | None = None
):
    now = datetime.now(timezone.utc)
    notification_target = models.notification.NotificationTarget(title=title,
                                                                 description=description,
                                                                 creator_id=creator_id,
                                                                 category=category,
                                                                 create_time=now)
    db.add(notification_target)
    db.flush()
    return notification_target

def create_ios_notification_target(
    db: Session,
    notification_target_id: int,
    device_token: str
):
    now = datetime.now(timezone.utc)
    ios_notification_target = models.notification.IOSNotificationTarget(notification_target_id=notification_target_id,
                                                                        device_token=device_token,
                                                                        create_time=now)
    db.add(ios_notification_target)
    db.flush()
    return ios_notification_target

def create_email_notification_target(
    db: Session,
    notification_target_id: int,
    email: str
):
    now = datetime.now(timezone.utc)
    email_notification_target = models.notification.EmailNotificationTarget(notification_target_id=notification_target_id,
                                                                            email=email,
                                                                            create_time=now)
    db.add(email_notification_target)
    db.flush()
    return email_notification_target

def create_notification_source(
    db: Session,
    creator_id: int,
    title: str,
    category: int,
    description: str | None = None
):
    now = datetime.now(timezone.utc)
    notification_source = models.notification.NotificationSource(creator_id=creator_id, 
                                                                 title=title,
                                                                 description=description,
                                                                 category=category,
                                                                 create_time=now)
    db.add(notification_source)
    db.flush()
    return notification_source

def create_ios_notification_source(
    db: Session,
    notification_source_id: int,
    team_id: str,
    key_id: str,
    private_key: str,
    app_bundle_id: str
):
    now = datetime.now(timezone.utc)
    ios_notification_source = models.notification.IOSNotificationSource(notification_source_id=notification_source_id,
                                                                        team_id=team_id,
                                                                        key_id=key_id,
                                                                        private_key=private_key,
                                                                        app_bundle_id=app_bundle_id,
                                                                        create_time=now)
    db.add(ios_notification_source)
    db.flush()
    return ios_notification_source

def create_email_notification_source(
    db: Session,
    notification_source_id: int,
    email: str,
    password: str,
    server: str,
    port: int
):
    now = datetime.now(timezone.utc)
    email_notification_source = models.notification.EmailNotificationSource(notification_source_id=notification_source_id,
                                                                            email=email,
                                                                            password=password,
                                                                            server=server,
                                                                            port=port,
                                                                            create_time=now)
    db.add(email_notification_source)
    db.flush()
    return email_notification_source

def create_notification_record(
    db: Session, 
    user_id: int, 
    title: str,
    notification_source_id: int,
    notification_target_id: int,
    content: str | None = None
):
    now = datetime.now(timezone.utc)
    notification = models.notification.NotificationRecord(user_id=user_id, 
                                                          title=title,
                                                          content=content, 
                                                          notification_source_id=notification_source_id,
                                                          notification_target_id=notification_target_id,
                                                          create_time=now)
    db.add(notification)
    db.flush()
    return notification

def get_notification_task_content_template_by_notification_task_id(
    db: Session,
    notification_task_id: int
):
    query = db.query(models.notification.NotificationTaskContentTemplate)
    query = query.filter(models.notification.NotificationTaskContentTemplate.notification_task_id == notification_task_id,
                         models.notification.NotificationTaskContentTemplate.delete_at == None)
    return query.one_or_none()

def get_notification_task_content_custom_by_notification_task_id(
    db: Session,
    notification_task_id: int
):
    query = db.query(models.notification.NotificationTaskContentCustom)
    query = query.filter(models.notification.NotificationTaskContentCustom.notification_task_id == notification_task_id,
                         models.notification.NotificationTaskContentCustom.delete_at == None)
    return query.one_or_none()

def get_all_notification_tasks(
    db: Session
):
    query = db.query(models.notification.NotificationTask)
    query = query.filter(models.notification.NotificationTask.delete_at == None)
    return query.all()

def get_notification_task_by_notification_task_id(
    db: Session,
    notification_task_id: int
):
    query = db.query(models.notification.NotificationTask)
    query = query.filter(models.notification.NotificationTask.id == notification_task_id,
                         models.notification.NotificationTask.delete_at == None)
    return query.one_or_none()

def get_notification_tasks_by_user_id(
    db: Session,
    user_id: int,
    page_num: int,
    page_size: int = 10
):
    query = db.query(models.notification.NotificationTask)
    query = query.filter(models.notification.NotificationTask.user_id == user_id,
                         models.notification.NotificationTask.delete_at == None)
    query = query.order_by(models.notification.NotificationTask.id.desc())
    query = query.offset((page_num - 1) * page_size)
    query = query.limit(page_size)
    return query.all()

def count_notification_tasks_for_user(
    db: Session,
    user_id: int
):
    query = db.query(models.notification.NotificationTask)
    query = query.filter(models.notification.NotificationTask.user_id == user_id,
                         models.notification.NotificationTask.delete_at == None)
    return query.count()

def get_notification_target_by_notification_target_id(
    db: Session, 
    notification_target_id: int
):
    query = db.query(models.notification.NotificationTarget)
    query = query.filter(models.notification.NotificationTarget.id == notification_target_id,
                         models.notification.NotificationTarget.delete_at == None)
    return query.one_or_none()

def get_notification_targets_by_creator_id(
    db: Session,
    creator_id: int
):
    query = db.query(models.notification.NotificationTarget)
    query = query.filter(models.notification.NotificationTarget.creator_id == creator_id,
                         models.notification.NotificationTarget.delete_at == None)
    return query.all()

def get_email_notification_target_by_notification_target_id(
    db: Session, 
    notification_target_id: int
):
    query = db.query(models.notification.EmailNotificationTarget)
    query = query.join(models.notification.NotificationTarget)
    query = query.filter(models.notification.EmailNotificationTarget.notification_target_id == notification_target_id,
                         models.notification.EmailNotificationTarget.delete_at == None,
                         models.notification.NotificationTarget.delete_at == None)
    return query.one_or_none()

def get_ios_notification_target_by_notification_target_id(
    db: Session, 
    notification_target_id: int
):
    query = db.query(models.notification.IOSNotificationTarget)
    query = query.join(models.notification.NotificationTarget)
    query = query.filter(models.notification.IOSNotificationTarget.notification_target_id == notification_target_id,
                         models.notification.IOSNotificationTarget.delete_at == None,
                         models.notification.NotificationTarget.delete_at == None)
    return query.one_or_none()

def get_email_notification_source_by_notification_source_id(
    db: Session, 
    notification_source_id: int
):
    query = db.query(models.notification.EmailNotificationSource)
    query = query.join(models.notification.NotificationSource)
    query = query.filter(models.notification.EmailNotificationSource.notification_source_id == notification_source_id,
                         models.notification.EmailNotificationSource.delete_at == None,
                         models.notification.NotificationSource.delete_at == None)
    return query.one_or_none()

def get_ios_notification_source_by_notification_source_id(
    db: Session, 
    notification_source_id: int
):
    query = db.query(models.notification.IOSNotificationSource)
    query = query.join(models.notification.NotificationSource)
    query = query.filter(models.notification.IOSNotificationSource.notification_source_id == notification_source_id,
                         models.notification.IOSNotificationSource.delete_at == None,
                         models.notification.NotificationSource.delete_at == None)
    return query.one_or_none()

def get_notification_source_by_notification_source_id(
    db: Session, 
    notification_source_id: int
):
    query = db.query(models.notification.NotificationSource)
    query = query.filter(models.notification.NotificationSource.id == notification_source_id,
                         models.notification.NotificationSource.delete_at == None)
    return query.one_or_none()

def get_notification_sources_by_creator_id(
    db: Session, 
    creator_id: int
):
    query = db.query(models.notification.NotificationSource)
    query = query.filter(models.notification.NotificationSource.creator_id == creator_id,
                         models.notification.NotificationSource.delete_at == None)
    return query.all()

def get_notification_record_by_user_id_and_notification_record_id(
    db: Session, 
    user_id: int, 
    notification_record_id: int
):
    query = db.query(models.notification.NotificationRecord)
    query = query.filter(models.notification.NotificationRecord.user_id == user_id,
                         models.notification.NotificationRecord.id == notification_record_id,
                         models.notification.NotificationRecord.delete_at == None)
    return query.one_or_none()

def search_next_notification_record_for_user(
    db: Session, 
    user_id: int, 
    notification_record: models.notification.NotificationRecord, 
    keyword: str | None = None
):
    query = db.query(models.notification.NotificationRecord)

    if keyword is not None and len(keyword) > 0:
        query = query.filter(models.notification.NotificationRecord.content.like(f"%{keyword}%"))

    query = query.filter(models.notification.NotificationRecord.user_id == user_id, 
                         models.notification.NotificationRecord.delete_at == None)
    
    query = query.order_by(models.notification.NotificationRecord.id.desc())
    
    query = query.filter(models.notification.NotificationRecord.id < notification_record.id)

    return query.first()

def count_notification_records_for_user(
    db: Session, 
    user_id: int, 
    keyword: str | None = None
):
    query = db.query(models.notification.NotificationRecord)
    
    if keyword is not None and len(keyword) > 0:
        query = query.filter(or_(models.notification.NotificationRecord.content.like(f"%{keyword}%"), 
                                 models.notification.NotificationRecord.title.like(f"%{keyword}%")))

    query = query.filter(models.notification.NotificationRecord.user_id == user_id,
                         models.notification.NotificationRecord.delete_at == None)
    
    return query.count()

def search_notification_records_for_user(
    db: Session, 
    user_id: int, 
    start: int | None = None, 
    limit: int = 10, 
    keyword: str | None = None
):
    query = db.query(models.notification.NotificationRecord)
    
    if keyword is not None and len(keyword) > 0:
        query = query.filter(or_(models.notification.NotificationRecord.content.like(f"%{keyword}%"),
                                 models.notification.NotificationRecord.title.like(f"%{keyword}%")))
        
    query = query.filter(models.notification.NotificationRecord.user_id == user_id,
                         models.notification.NotificationRecord.delete_at == None)
    
    query = query.order_by(models.notification.NotificationRecord.id.desc())

    if start is not None:
        query = query.filter(models.notification.NotificationRecord.id <= start)
    
    query = query.limit(limit)
    return query.all()

def read_all_notification_records_for_user(
    db: Session, 
    user_id: int
):
    now = datetime.now(timezone.utc)
    query = db.query(models.notification.NotificationRecord)
    query = query.filter(models.notification.NotificationRecord.user_id == user_id)
    query.update({models.notification.NotificationRecord.read_at: now}, synchronize_session=False)
    db.flush()

def read_notification_records_by_notification_record_ids_for_user(
    db: Session, 
    user_id: int, 
    notification_record_ids: list[int]
):
    if not notification_record_ids:
        return
    now = datetime.now(timezone.utc)
    query = db.query(models.notification.NotificationRecord)
    query = query.filter(models.notification.NotificationRecord.id.in_(notification_record_ids),
                         models.notification.NotificationRecord.user_id == user_id,
                         models.notification.NotificationRecord.delete_at == None)
    query.update({models.notification.NotificationRecord.read_at: now}, synchronize_session=False)
    db.flush()
    
def unread_notification_records_by_notification_record_ids_for_user(
    db: Session, 
    user_id: int, 
    notification_record_ids: list[int]
):
    if not notification_record_ids:
        return
    now = datetime.now(timezone.utc)
    query = db.query(models.notification.NotificationRecord)
    query = query.filter(models.notification.NotificationRecord.id.in_(notification_record_ids),
                         models.notification.NotificationRecord.user_id == user_id,
                         models.notification.NotificationRecord.delete_at == None)
    query.update({models.notification.NotificationRecord.read_at: now}, synchronize_session=False)
    db.flush()

def delete_notification_targets_by_notification_target_ids(
    db: Session, 
    creator_id: int, 
    notification_target_ids: list[int]
):
    if not notification_target_ids:
        return
    now = datetime.now(timezone.utc)
    query = db.query(models.notification.NotificationTarget)
    query = query.filter(models.notification.NotificationTarget.id.in_(notification_target_ids),
                         models.notification.NotificationTarget.creator_id == creator_id,
                         models.notification.NotificationTarget.delete_at == None)
    query.update({models.notification.NotificationTarget.delete_at: now}, synchronize_session=False)
    db.flush()
    
def delete_notification_sources_by_notification_source_ids(
    db: Session,
    creator_id: int,
    notification_source_ids: list[int]
):
    if not notification_source_ids:
        return
    now = datetime.now(timezone.utc)
    query = db.query(models.notification.NotificationSource)
    query = query.filter(models.notification.NotificationSource.id.in_(notification_source_ids),
                         models.notification.NotificationSource.creator_id == creator_id,
                         models.notification.NotificationSource.delete_at == None)
    query.update({models.notification.NotificationSource.delete_at: now}, synchronize_session=False)
    db.flush()

def delete_notification_records_by_notification_record_ids(
    db: Session, 
    user_id: int,
    notification_record_ids: list[int]
):
    if not notification_record_ids:
        return
    now = datetime.now(timezone.utc)
    query = db.query(models.notification.NotificationRecord)
    query = query.filter(models.notification.NotificationRecord.id.in_(notification_record_ids),
                         models.notification.NotificationRecord.user_id == user_id,
                         models.notification.NotificationRecord.delete_at == None)
    query.update({models.notification.NotificationRecord.delete_at: now}, synchronize_session=False)
    db.flush()
    
def delete_notification_tasks(
    db: Session,
    user_id: int,
    notification_task_ids: list[int]
):
    if not notification_task_ids:
        return
    now = datetime.now(timezone.utc)
    query = db.query(models.notification.NotificationTask)
    query = query.filter(models.notification.NotificationTask.id.in_(notification_task_ids),
                         models.notification.NotificationTask.user_id == user_id,
                         models.notification.NotificationTask.delete_at == None)
    query.update({models.notification.NotificationTask.delete_at: now}, synchronize_session=False)
    db.flush()
    
def delete_email_notification_sources_by_notification_source_ids(
    db: Session, 
    creator_id: int, 
    notification_source_ids: list[int]
):
    if not notification_source_ids:
        return
    now = datetime.now(timezone.utc)

    valid_source_ids = (
        db.query(models.notification.NotificationSource.id)
        .filter(
            models.notification.NotificationSource.creator_id == creator_id,
            models.notification.NotificationSource.id.in_(notification_source_ids)
        )
        .scalar_subquery()
    )

    db.query(models.notification.EmailNotificationSource).filter(
        models.notification.EmailNotificationSource.notification_source_id.in_(valid_source_ids),
        models.notification.EmailNotificationSource.delete_at.is_(None)
    ).update({models.notification.EmailNotificationSource.delete_at: now}, synchronize_session=False)
    
    db.flush()

def delete_notification_task_content_template_by_notification_task_id(
    db: Session,
    user_id: int,
    notification_task_id: int
):
    now = datetime.now(timezone.utc)
    
    query = db.query(models.notification.NotificationTaskContentTemplate)
    query = query.join(models.notification.NotificationTask)
    query = query.filter(models.notification.NotificationTaskContentTemplate.notification_task_id == notification_task_id,
                         models.notification.NotificationTask.user_id == user_id,
                         models.notification.NotificationTaskContentTemplate.delete_at == None)
    db_notification_task_content_template = query.one_or_none()
    if db_notification_task_content_template is not None:
        db_notification_task_content_template.delete_at = now
        db.flush()
    
def delete_notification_task_content_custom_by_notification_task_id(
    db: Session,
    user_id: int,
    notification_task_id: int
):
    now = datetime.now(timezone.utc)
    query = db.query(models.notification.NotificationTaskContentCustom)
    query = query.join(models.notification.NotificationTask)
    query = query.filter(models.notification.NotificationTaskContentCustom.notification_task_id == notification_task_id,
                         models.notification.NotificationTask.user_id == user_id,
                         models.notification.NotificationTaskContentCustom.delete_at == None)
    db_notification_task_content_custom = query.one_or_none()
    if db_notification_task_content_custom is not None:
        db_notification_task_content_custom.delete_at = now
        db.flush()
    