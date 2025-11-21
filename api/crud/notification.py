import models
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy import or_

def create_notification_trigger_event(
    db: Session,
    uuid: str,
    name: str,
    name_zh: str,
    description: str | None = None,
    description_zh: str | None = None
):
    now = datetime.now(timezone.utc)
    db_notification_trigger_event = models.notification.TriggerEvent(
        uuid=uuid,
        name=name,
        name_zh=name_zh,
        description=description,
        description_zh=description_zh,
        create_time=now
    )
    db.add(db_notification_trigger_event)
    db.flush()
    return db_notification_trigger_event

def create_notification_task_content_custom(
    db: Session, 
    notification_task_id: int,
    title: str,
    content: str | None = None
):
    db_notification_task_content_custom = models.notification.NotificationTaskContentCustom(
        notification_task_id=notification_task_id,
        title=title,
        content=content
    )
    db.add(db_notification_task_content_custom)
    db.flush()
    return db_notification_task_content_custom

def create_notification_task_content_template(
    db: Session,
    notification_task_id: int,
    notification_template_id: int
):
    db_notification_task_content_tmeplate = models.notification.NotificationTaskContentTemplate(
        notification_task_id=notification_task_id,
        notification_template_id=notification_template_id
    )
    db.add(db_notification_task_content_tmeplate)
    db.flush()
    return db_notification_task_content_tmeplate

def create_notification_task(
    db: Session, 
    user_id: int,
    notification_content_type: int,
    user_notification_source_id: int,
    user_notification_target_id: int,
    trigger_type: int,
    enable: bool
):
    now = datetime.now(timezone.utc)
    notification_task = models.notification.NotificationTask(
        user_id=user_id,
        notification_content_type=notification_content_type,
        user_notification_source_id=user_notification_source_id,
        user_notification_target_id=user_notification_target_id,
        trigger_type=trigger_type,
        create_time=now,
        enable=enable
    )
    db.add(notification_task)
    db.flush()
    return notification_task

def create_notification_task_trigger_event(
    db: Session,
    notification_task_id: int,
    trigger_event_id: int
):
    db_notification_task_trigger_event = models.notification.NotificationTaskTriggerEvent(
        notification_task_id=notification_task_id,
        trigger_event_id=trigger_event_id
    )
    db.add(db_notification_task_trigger_event)
    db.flush()
    return db_notification_task_trigger_event

def create_notification_task_trigger_scheduler(
    db: Session,
    notification_task_id: int,
    cron_expr: str
):
    db_notification_task_trigger_scheduler = models.notification.NotificationTaskTriggerScheduler(
        notification_task_id=notification_task_id,
        cron_expr=cron_expr
    )
    db.add(db_notification_task_trigger_scheduler)
    db.flush()
    return db_notification_task_trigger_scheduler

def create_notification_source(
    db: Session,
    uuid: str,
    name: str,
    name_zh: str,
    description: str | None = None,
    description_zh: str | None = None,
    demo_config: str | None = None
):
    now = datetime.now(timezone.utc)
    notification_source = models.notification.NotificationSource(
        uuid=uuid,
        name=name,
        name_zh=name_zh,
        description=description,
        description_zh=description_zh,
        create_time=now,
        enable=True,
        demo_config=demo_config
    )
    db.add(notification_source)
    db.flush()
    return notification_source

def create_user_notification_source(
    db: Session,
    notification_source_id: int,
    creator_id: int,
    title: str,
    description: str | None = None,
    config_json: str | None = None
):
    now = datetime.now(timezone.utc)
    user_notification_source = models.notification.UserNotificationSource(
        notification_source_id=notification_source_id,
        title=title,
        description=description,
        creator_id=creator_id,
        config_json=config_json,
        create_time=now
    )
    db.add(user_notification_source)

def create_notification_target(
    db: Session,
    uuid: str,
    name: str,
    name_zh: str,
    description: str | None = None,
    description_zh: str | None = None,
    demo_config: str | None = None
):
    now = datetime.now(timezone.utc)
    notification_target = models.notification.NotificationTarget(
        uuid=uuid,
        name=name,
        name_zh=name_zh,
        description=description,
        description_zh=description_zh,
        create_time=now,
        enable=True,
        demo_config=demo_config
    )
    db.add(notification_target)
    db.flush()
    return notification_target

def create_user_notification_target(
    db: Session,
    notification_target_id: int,
    creator_id: int,
    title: str,
    description: str | None = None,
    config_json: str | None = None
):
    now = datetime.now(timezone.utc)
    notification_target = models.notification.UserNotificationTarget(
        title=title,
        notification_target_id=notification_target_id,
        description=description,
        creator_id=creator_id,
        config_json=config_json,
        create_time=now
    )
    db.add(notification_target)
    db.flush()
    return notification_target

def create_notification_record(
    db: Session, 
    user_id: int, 
    title: str,
    content: str | None = None,
    cover: str | None = None
):
    now = datetime.now(timezone.utc)
    notification = models.notification.NotificationRecord(
        user_id=user_id, 
        title=title,
        content=content, 
        cover=cover,
        create_time=now
    )
    db.add(notification)
    db.flush()
    return notification

def get_all_provided_notification_sources(
    db: Session
):
    query = db.query(models.notification.NotificationSource)
    query = query.filter(
        models.notification.NotificationSource.delete_at == None
    )
    return query.all()

def get_notification_source_by_uuid(
    db: Session,
    uuid: str
):
    query = db.query(models.notification.NotificationSource)
    query = query.filter(
        models.notification.NotificationSource.uuid == uuid,
        models.notification.NotificationSource.delete_at == None
    )
    return query.one_or_none()

def get_notification_target_by_uuid(
    db: Session,
    uuid: str
):
    query = db.query(models.notification.NotificationTarget)
    query = query.filter(
        models.notification.NotificationTarget.uuid == uuid,
        models.notification.NotificationTarget.delete_at == None
    )
    return query.one_or_none()

def get_trigger_event_by_uuid(
    db: Session,
    uuid: str
):
    query = db.query(models.notification.TriggerEvent)
    query = query.filter(
        models.notification.TriggerEvent.uuid == uuid,
        models.notification.TriggerEvent.delete_at == None
    )
    return query.one_or_none()

def get_all_trigger_events(
    db: Session
):
    query = db.query(models.notification.TriggerEvent)
    query = query.filter(
        models.notification.TriggerEvent.delete_at == None
    )
    return query.all()

def get_all_provided_notification_targets(
    db: Session
):
    query = db.query(models.notification.NotificationTarget)
    query = query.filter(
        models.notification.NotificationTarget.delete_at == None
    )
    return query.all()

def get_notification_task_trigger_scheduler_by_notification_task_id(
    db: Session,
    notification_task_id: int
):
    query = db.query(models.notification.NotificationTaskTriggerScheduler)
    query = query.filter(
        models.notification.NotificationTaskTriggerScheduler.notification_task_id == notification_task_id,
        models.notification.NotificationTaskTriggerScheduler.delete_at == None
    )
    return query.one_or_none()

def get_notification_task_trigger_event_by_notification_task_id(
    db: Session,
    notification_task_id: int
):
    query = db.query(models.notification.NotificationTaskTriggerEvent)
    query = query.filter(
        models.notification.NotificationTaskTriggerEvent.notification_task_id == notification_task_id,
        models.notification.NotificationTaskTriggerEvent.delete_at == None
    )
    return query.one_or_none()

def get_notification_task_content_template_by_notification_task_id(
    db: Session,
    notification_task_id: int
):
    query = db.query(models.notification.NotificationTaskContentTemplate)
    query = query.filter(
        models.notification.NotificationTaskContentTemplate.notification_task_id == notification_task_id,
        models.notification.NotificationTaskContentTemplate.delete_at == None
    )
    return query.one_or_none()

def get_notification_task_content_custom_by_notification_task_id(
    db: Session,
    notification_task_id: int
):
    query = db.query(models.notification.NotificationTaskContentCustom)
    query = query.filter(
        models.notification.NotificationTaskContentCustom.notification_task_id == notification_task_id,
        models.notification.NotificationTaskContentCustom.delete_at == None
    )
    return query.one_or_none()

def get_all_notification_tasks(
    db: Session
):
    query = db.query(models.notification.NotificationTask)
    query = query.filter(
        models.notification.NotificationTask.delete_at == None
    )
    return query.all()

def get_notification_task_by_notification_task_id(
    db: Session,
    notification_task_id: int
):
    query = db.query(models.notification.NotificationTask)
    query = query.filter(
        models.notification.NotificationTask.id == notification_task_id,
        models.notification.NotificationTask.delete_at == None
    )
    return query.one_or_none()

def get_notification_tasks_for_user(
    db: Session,
    user_id: int,
    page_num: int,
    page_size: int = 10
):
    query = db.query(models.notification.NotificationTask)
    query = query.filter(
        models.notification.NotificationTask.user_id == user_id,
        models.notification.NotificationTask.delete_at == None
    )
    query = query.order_by(models.notification.NotificationTask.id.desc())
    query = query.offset((page_num - 1) * page_size)
    query = query.limit(page_size)
    return query.all()

def count_notification_tasks_for_user(
    db: Session,
    user_id: int
):
    query = db.query(models.notification.NotificationTask)
    query = query.filter(
        models.notification.NotificationTask.user_id == user_id,
        models.notification.NotificationTask.delete_at == None
    )
    return query.count()

def get_user_notification_target_by_user_notification_target_id(
    db: Session, 
    user_notification_target_id: int
):
    query = db.query(models.notification.UserNotificationTarget)
    query = query.filter(
        models.notification.UserNotificationTarget.id == user_notification_target_id,
        models.notification.UserNotificationTarget.delete_at == None
    )
    return query.one_or_none()

def get_user_notification_targets_by_creator_id(
    db: Session,
    creator_id: int
):
    query = db.query(models.notification.UserNotificationTarget)
    query = query.filter(
        models.notification.UserNotificationTarget.creator_id == creator_id,
        models.notification.UserNotificationTarget.delete_at == None
    )
    return query.all()

def get_notification_source_by_notification_source_id(
    db: Session, 
    notification_source_id: int
):
    query = db.query(models.notification.NotificationSource)
    query = query.filter(
        models.notification.NotificationSource.id == notification_source_id,
        models.notification.NotificationSource.delete_at == None
    )
    return query.one_or_none()

def get_user_notification_source_by_user_notification_source_id(
    db: Session, 
    user_notification_source_id: int
):
    query = db.query(models.notification.UserNotificationSource)
    query = query.filter(
        models.notification.UserNotificationSource.id == user_notification_source_id,
        models.notification.UserNotificationSource.delete_at == None
    )
    return query.one_or_none()

def get_user_notification_sources_by_creator_id(
    db: Session, 
    creator_id: int
):
    query = db.query(models.notification.UserNotificationSource)
    query = query.filter(
        models.notification.UserNotificationSource.creator_id == creator_id,
        models.notification.UserNotificationSource.delete_at == None
    )
    return query.all()

def get_notification_record_by_user_id_and_notification_record_id(
    db: Session, 
    user_id: int, 
    notification_record_id: int
):
    query = db.query(models.notification.NotificationRecord)
    query = query.filter(
        models.notification.NotificationRecord.user_id == user_id,
        models.notification.NotificationRecord.id == notification_record_id,
        models.notification.NotificationRecord.delete_at == None
    )
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
    query = query.filter(
        models.notification.NotificationRecord.id.in_(notification_record_ids),
        models.notification.NotificationRecord.user_id == user_id,
        models.notification.NotificationRecord.delete_at == None
    )
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
    query = query.filter(
        models.notification.NotificationRecord.id.in_(notification_record_ids),
        models.notification.NotificationRecord.user_id == user_id,
        models.notification.NotificationRecord.delete_at == None
    )
    query.update({models.notification.NotificationRecord.read_at: now}, synchronize_session=False)
    db.flush()

def delete_user_notification_sources_by_user_notification_source_ids(
    db: Session,
    creator_id: int,
    user_notification_source_ids: list[int]
):
    if not user_notification_source_ids:
        return
    now = datetime.now(timezone.utc)
    query = db.query(models.notification.UserNotificationSource)
    query = query.filter(models.notification.UserNotificationSource.id.in_(user_notification_source_ids),
                         models.notification.UserNotificationSource.creator_id == creator_id,
                         models.notification.UserNotificationSource.delete_at == None)
    query.update({models.notification.UserNotificationSource.delete_at: now}, synchronize_session=False)
    db.flush()

def delete_user_notification_targets_by_user_notification_target_ids(
    db: Session, 
    creator_id: int, 
    user_notification_target_ids: list[int]
):
    if not user_notification_target_ids:
        return
    now = datetime.now(timezone.utc)
    query = db.query(models.notification.UserNotificationTarget)
    query = query.filter(
        models.notification.UserNotificationTarget.id.in_(user_notification_target_ids),
        models.notification.UserNotificationTarget.creator_id == creator_id,
        models.notification.UserNotificationTarget.delete_at == None
    )
    query.update({models.notification.UserNotificationTarget.delete_at: now}, synchronize_session=False)
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
    query = query.filter(
        models.notification.NotificationRecord.id.in_(notification_record_ids),
        models.notification.NotificationRecord.user_id == user_id,
        models.notification.NotificationRecord.delete_at == None
    )
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
    query = query.filter(
        models.notification.NotificationTask.id.in_(notification_task_ids),
        models.notification.NotificationTask.user_id == user_id,
        models.notification.NotificationTask.delete_at == None
    )
    query.update({models.notification.NotificationTask.delete_at: now}, synchronize_session=False)
    db.flush()
    
def delete_notification_task_content_template_by_notification_task_id(
    db: Session,
    user_id: int,
    notification_task_id: int
):
    now = datetime.now(timezone.utc)
    
    query = db.query(models.notification.NotificationTaskContentTemplate)
    query = query.join(models.notification.NotificationTask)
    query = query.filter(
        models.notification.NotificationTaskContentTemplate.notification_task_id == notification_task_id,
        models.notification.NotificationTask.user_id == user_id,
        models.notification.NotificationTaskContentTemplate.delete_at == None
    )
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
    query = query.filter(
        models.notification.NotificationTaskContentCustom.notification_task_id == notification_task_id,
        models.notification.NotificationTask.user_id == user_id,
        models.notification.NotificationTaskContentCustom.delete_at == None
    )
    db_notification_task_content_custom = query.one_or_none()
    if db_notification_task_content_custom is not None:
        db_notification_task_content_custom.delete_at = now
        db.flush()
    