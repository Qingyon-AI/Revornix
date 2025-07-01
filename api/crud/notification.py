import models
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy import or_

def bind_notification_task_content_custom_to_notification_task(db: Session, 
                                                               notification_task_id: int,
                                                               title: str,
                                                               content: str):
    notification_task_content_custom = models.notification.NotificationTaskContentCustom(notification_task_id=notification_task_id,
                                                                                         title=title,
                                                                                         content=content)
    db.add(notification_task_content_custom)
    db.flush()
    return notification_task_content_custom

def bind_notification_task_content_template_to_notification_task(db: Session,
                                                                 notification_task_id: int,
                                                                 notification_template_id: int):
    notification_task_content_tmeplate = models.notification.NotificationTaskContentTemplate(notification_task_id=notification_task_id,
                                                                                             notification_template_id=notification_template_id)
    db.add(notification_task_content_tmeplate)
    db.flush()
    return notification_task_content_tmeplate

def create_notification_task(db: Session, 
                             user_id: int,
                             cron_expr: str,
                             notification_content_type: int,
                             notification_source_id: int,
                             notification_target_id: int):
    now = datetime.now(timezone.utc)
    notification_task = models.notification.NotificationTask(user_id=user_id,
                                                             notification_content_type=notification_content_type,
                                                             notification_source_id=notification_source_id,
                                                             notification_target_id=notification_target_id,
                                                             cron_expr=cron_expr,
                                                             create_time=now,
                                                             update_time=now,
                                                             enable=True)
    db.add(notification_task)
    db.flush()
    return notification_task

def create_notification_target(db: Session,
                               creator_id: int,
                               title: str,
                               description: str,
                               category: int):
    now = datetime.now(timezone.utc)
    notification_target = models.notification.NotificationTarget(title=title,
                                                                 description=description,
                                                                 creator_id=creator_id,
                                                                 category=category,
                                                                 create_time=now,
                                                                 update_time=now)
    db.add(notification_target)
    db.flush()
    return notification_target

def bind_email_info_to_notification_target(db: Session,
                                           notification_target_id: int,
                                           email: str):
    now = datetime.now(timezone.utc)
    email_notification_target = models.notification.EmailNotificationTarget(notification_target_id=notification_target_id,
                                                                            email=email,
                                                                            create_time=now,
                                                                            update_time=now)
    db.add(email_notification_target)
    db.flush()
    return email_notification_target

def create_notification_source(db: Session,
                               user_id: int,
                               title: str,
                               description: str,
                               category: str):
    now = datetime.now(timezone.utc)
    notification_source = models.notification.NotificationSource(user_id=user_id, 
                                                                 title=title,
                                                                 description=description,
                                                                 category=category,
                                                                 create_time=now,
                                                                 update_time=now)
    db.add(notification_source)
    db.flush()
    return notification_source

def bind_email_info_to_notification_source(db: Session,
                                           notification_source_id: int,
                                           email: str,
                                           password: str,
                                           server: str,
                                           port: int):
    now = datetime.now(timezone.utc)
    email_notification_source = models.notification.EmailNotificationSource(notification_source_id=notification_source_id,
                                                                            email=email,
                                                                            password=password,
                                                                            create_time=now,
                                                                            update_time=now,
                                                                            server=server,
                                                                            port=port)
    db.add(email_notification_source)
    db.flush()
    return email_notification_source

def create_notification_record(db: Session, 
                               user_id: int, 
                               title: str,
                               content: str,
                               notification_source_id: int,
                               notification_target_id: int):
    now = datetime.now(timezone.utc)
    notification = models.notification.NotificationRecord(user_id=user_id, 
                                                          title=title,
                                                          content=content, 
                                                          notification_source_id=notification_source_id,
                                                          notification_target_id=notification_target_id,
                                                          create_time=now,
                                                          update_time=now)
    db.add(notification)
    db.flush()
    return notification

def get_notification_task_content_template_by_notification_task_id(db: Session,
                                                                   notification_task_id: int):
    query = db.query(models.notification.NotificationTaskContentTemplate)
    query = query.filter(models.notification.NotificationTaskContentTemplate.notification_task_id == notification_task_id,
                         models.notification.NotificationTaskContentTemplate.delete_at == None)
    return query.first()

def get_notification_task_content_custom_by_notification_task_id(db: Session,
                                                                 notification_task_id: int):
    query = db.query(models.notification.NotificationTaskContentCustom)
    query = query.filter(models.notification.NotificationTaskContentCustom.notification_task_id == notification_task_id,
                         models.notification.NotificationTaskContentCustom.delete_at == None)
    return query.first()

def get_all_notification_tasks(db: Session):
    query = db.query(models.notification.NotificationTask)
    query = query.filter(models.notification.NotificationTask.delete_at == None)
    return query.all()

def get_notification_task_by_notification_task_id(db: Session,
                                                  notification_task_id: int):
    query = db.query(models.notification.NotificationTask)
    query = query.filter(models.notification.NotificationTask.id == notification_task_id,
                         models.notification.NotificationTask.delete_at == None)
    return query.first()

def get_notification_tasks_by_user_id(db: Session,
                                      user_id: int):
    query = db.query(models.notification.NotificationTask)
    query = query.filter(models.notification.NotificationTask.user_id == user_id,
                         models.notification.NotificationTask.delete_at == None)
    return query.all()

def get_notification_target_by_notification_target_id(db: Session, 
                                                      notification_target_id: int):
    query = db.query(models.notification.NotificationTarget)
    query = query.filter(models.notification.NotificationTarget.id == notification_target_id,
                         models.notification.NotificationTarget.delete_at == None)
    return query.first()

def get_notification_targets_by_creator_id(db: Session,
                                           creator_id: int):
    query = db.query(models.notification.NotificationTarget)
    query = query.filter(models.notification.NotificationTarget.creator_id == creator_id,
                         models.notification.NotificationTarget.delete_at == None)
    return query.all()

def get_email_notification_target_by_notification_target_id(db: Session, 
                                                            notification_target_id: int):
    query = db.query(models.notification.EmailNotificationTarget)
    query = query.join(models.notification.NotificationTarget)
    query = query.filter(models.notification.EmailNotificationTarget.notification_target_id == notification_target_id,
                         models.notification.EmailNotificationTarget.delete_at == None,
                         models.notification.NotificationTarget.delete_at == None)
    return query.first()

def get_email_notification_source_by_notification_source_id(db: Session, 
                                                            notification_source_id: int):
    query = db.query(models.notification.EmailNotificationSource)
    query = query.join(models.notification.NotificationSource)
    query = query.filter(models.notification.EmailNotificationSource.notification_source_id == notification_source_id,
                         models.notification.EmailNotificationSource.delete_at == None,
                         models.notification.NotificationSource.delete_at == None)
    return query.first()

def get_notification_source_by_notification_source_id(db: Session, 
                                                      notification_source_id: int):
    query = db.query(models.notification.NotificationSource)
    query = query.filter(models.notification.NotificationSource.id == notification_source_id,
                         models.notification.NotificationSource.delete_at == None)
    return query.first()

def get_notification_sources_by_user_id(db: Session, 
                                        user_id: int):
    query = db.query(models.notification.NotificationSource)
    query = query.filter(models.notification.NotificationSource.user_id == user_id,
                         models.notification.NotificationSource.delete_at == None)
    return query.all()

def get_user_notification_record_by_notification_record_id(db: Session, 
                                                           user_id: int, 
                                                           notification_record_id: int):
    query = db.query(models.notification.NotificationRecord)
    query = query.filter(models.notification.NotificationRecord.user_id == user_id,
                         models.notification.NotificationRecord.id == notification_record_id,
                         models.notification.NotificationRecord.delete_at == None)
    return query.first()

def search_next_notification_record(db: Session, 
                                    user_id: int, 
                                    notification_record: models.notification.NotificationRecord, 
                                    keyword: str | None = None):
    query = db.query(models.notification.NotificationRecord)

    if keyword is not None and len(keyword) > 0:
        query = query.filter(models.notification.NotificationRecord.content.like(f"%{keyword}%"))

    query = query.filter(models.notification.NotificationRecord.user_id == user_id, 
                         models.notification.NotificationRecord.delete_at == None)
    
    query = query.order_by(models.notification.NotificationRecord.create_time.desc())
    
    query = query.filter(models.notification.NotificationRecord.create_time < notification_record.create_time)

    return query.first()

def count_user_notification_records(db: Session, 
                                    user_id: int, 
                                    keyword: str | None = None):
    query = db.query(models.notification.NotificationRecord)
    
    if keyword is not None and len(keyword) > 0:
        query = query.filter(or_(models.notification.NotificationRecord.content.like(f"%{keyword}%"), 
                                 models.notification.NotificationRecord.title.like(f"%{keyword}%")))

    query = query.filter(models.notification.NotificationRecord.user_id == user_id,
                         models.notification.NotificationRecord.delete_at == None)
    
    return query.count()

def search_user_notification_records(db: Session, 
                                     user_id: int, 
                                     start: int | None = None, 
                                     limit: int = 10, 
                                     keyword: str | None = None):
    query = db.query(models.notification.NotificationRecord)
    
    if keyword is not None and len(keyword) > 0:
        query = query.filter(or_(models.notification.NotificationRecord.content.like(f"%{keyword}%"),
                                 models.notification.NotificationRecord.title.like(f"%{keyword}%")))
        
    query = query.filter(models.notification.NotificationRecord.user_id == user_id,
                         models.notification.NotificationRecord.delete_at == None)
    
    query = query.order_by(models.notification.NotificationRecord.create_time.desc())

    if start is not None:
        query = query.filter(models.notification.NotificationRecord.id <= start)
    
    query = query.limit(limit)
    return query.all()

def read_user_notification_records(db: Session, 
                                   user_id: int):
    query = db.query(models.notification.NotificationRecord)
    query = query.filter(models.notification.NotificationRecord.user_id == user_id)
    notifications = query.all()
    for notification in notifications:
        notification.read_at = datetime.now(timezone.utc)
    db.flush()

def read_notification_records_by_notification_record_ids(db: Session, 
                                                         user_id: int, 
                                                         notification_record_ids: list[int]):
    query = db.query(models.notification.NotificationRecord)
    query = query.filter(models.notification.NotificationRecord.id.in_(notification_record_ids),
                         models.notification.NotificationRecord.user_id == user_id)
    notification = query.first()
    notification.read_at = datetime.now(timezone.utc)
    db.flush()
    
def unread_notification_records_by_notification_record_ids(db: Session, 
                                                           user_id: int, 
                                                           notification_record_ids: list[int]):
    query = db.query(models.notification.NotificationRecord)
    query = query.filter(models.notification.NotificationRecord.id.in_(notification_record_ids),
                         models.notification.NotificationRecord.user_id == user_id)
    notification = query.first()
    notification.read_at = None
    db.flush()
    
def delete_notification_targets_by_notification_target_ids(db: Session, 
                                                           user_id: int, 
                                                           notification_target_ids: list[int]):
    now = datetime.now(timezone.utc)
    query = db.query(models.notification.NotificationTarget)
    query = query.filter(models.notification.NotificationTarget.id.in_(notification_target_ids),
                         models.notification.NotificationTarget.user_id == user_id,
                         models.notification.NotificationTarget.delete_at == None)
    for notification_target in query.all():
        notification_target.delete_at = now
    db.flush()
    
def delete_notification_sources_by_notification_source_ids(db: Session,
                                                           user_id: int,
                                                           notification_source_ids: list[int]):
    now = datetime.now(timezone.utc)
    query = db.query(models.notification.NotificationSource)
    query = query.filter(models.notification.NotificationSource.id.in_(notification_source_ids),
                         models.notification.NotificationSource.user_id == user_id,
                         models.notification.NotificationSource.delete_at == None)
    for notification_source in query.all():
        notification_source.delete_at = now
    db.flush()
    
def delete_email_notification_sources_by_notification_source_ids(db: Session,
                                                                 user_id: int,
                                                                 notification_source_ids: list[int]):
    now = datetime.now(timezone.utc)
    query = db.query(models.notification.EmailNotificationSource)
    query = query.join(models.notification.NotificationSource)
    query = query.filter(models.notification.EmailNotificationSource.notification_source_id.in_(notification_source_ids),
                         models.notification.EmailNotificationSource.delete_at == None,
                         models.notification.NotificationSource.user_id == user_id)
    for email_source in query.all():
        email_source.delete_at = now
    db.flush()
    
def delete_email_notification_sources_by_email_notification_source_ids(db: Session,
                                                                       user_id: int,
                                                                       email_notification_source_ids: list[int]):
    now = datetime.now(timezone.utc)
    query = db.query(models.notification.EmailNotificationSource)
    query = query.filter(models.notification.EmailNotificationSource.id.in_(email_notification_source_ids),
                         models.notification.EmailNotificationSource.user_id == user_id)
    for email_source in query.all():
        email_source.delete_at = now
    db.flush()

def delete_user_notification_records(db: Session, 
                                     user_id: int):
    now = datetime.now(timezone.utc)
    query = db.query(models.notification.NotificationRecord)
    query = query.filter(models.notification.NotificationRecord.user_id == user_id)
    for notification in query.all():
        notification.delete_at = now
    db.flush()

def delete_notification_records_by_notification_record_ids(db: Session, 
                                                           user_id: int,
                                                           notification_record_ids: list[int]):
    now = datetime.now(timezone.utc)
    query = db.query(models.notification.NotificationRecord)
    query = query.filter(models.notification.NotificationRecord.id.in_(notification_record_ids),
                         models.notification.NotificationRecord.user_id == user_id,
                         models.notification.NotificationRecord.delete_at == None)
    for notification in query.all():
        notification.delete_at = now
    db.flush()
    
def delete_notification_tasks(db: Session,
                              user_id: int,
                              notification_task_ids: list[int]):
    query = db.query(models.notification.NotificationTask)
    query = query.filter(models.notification.NotificationTask.id.in_(notification_task_ids),
                         models.notification.NotificationTask.user_id == user_id,
                         models.notification.NotificationTask.delete_at == None)
    for notification_task in query.all():
        notification_task.delete_at = datetime.now(timezone.utc)
    db.flush()
    
def delete_notification_task_content_template_by_notification_task_content_template_ids(db: Session,
                                                                                        user_id: int,
                                                                                        notification_task_content_template_ids: list[int]):
    now = datetime.now(timezone.utc)
    query = db.query(models.notification.NotificationTaskContentTemplate)
    query = query.filter(models.notification.NotificationTaskContentTemplate.id.in_(notification_task_content_template_ids),
                         models.notification.NotificationTaskContentTemplate.user_id == user_id,
                         models.notification.NotificationTaskContentTemplate.delete_at == None)
    for notification_task_content_template in query.all():
        notification_task_content_template.delete_at = now
    db.flush()
    
def delete_notification_task_content_template_by_notification_task_content_custom_ids(db: Session,
                                                                                      user_id: int,
                                                                                      notification_task_content_custom_ids: list[int]):
    now = datetime.now(timezone.utc)
    query = db.query(models.notification.NotificationTaskContentCustom)
    query = query.filter(models.notification.NotificationTaskContentCustom.id.in_(notification_task_content_custom_ids),
                         models.notification.NotificationTaskContentTemplate.user_id == user_id,
                         models.notification.NotificationTaskContentCustom.delete_at == None)
    for notification_task_content_custom in query.all():
        notification_task_content_custom.delete_at = now
    db.flush()
    
def delete_notification_task_content_template_by_notification_task_id(db: Session,
                                                                      user_id: int,
                                                                      notification_task_id: int):
    now = datetime.now(timezone.utc)
    query = db.query(models.notification.NotificationTaskContentTemplate)
    query = query.join(models.notification.NotificationTask)
    query = query.filter(models.notification.NotificationTaskContentTemplate.notification_task_id == notification_task_id,
                         models.notification.NotificationTask.user_id == user_id,
                         models.notification.NotificationTaskContentTemplate.delete_at == None)
    for notification_task_content_template in query.all():
        notification_task_content_template.delete_at = now
    db.flush()
    
def delete_notification_task_content_custom_by_notification_task_id(db: Session,
                                                                    user_id: int,
                                                                    notification_task_id: int):
    now = datetime.now(timezone.utc)
    query = db.query(models.notification.NotificationTaskContentCustom)
    query = query.join(models.notification.NotificationTask)
    query = query.filter(models.notification.NotificationTaskContentCustom.notification_task_id == notification_task_id,
                         models.notification.NotificationTask.user_id == user_id,
                         models.notification.NotificationTaskContentCustom.delete_at == None)
    for notification_task_content_custom in query.all():
        notification_task_content_custom.delete_at = now
    db.flush()
    