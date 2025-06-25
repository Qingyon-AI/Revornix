import models
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy import or_

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
                                           address: str,
                                           port: int):
    now = datetime.now(timezone.utc)
    email_notification_source = models.notification.EmailNotificationSource(notification_source_id=notification_source_id,
                                                                            email=email,
                                                                            password=password,
                                                                            create_time=now,
                                                                            update_time=now,
                                                                            address=address,
                                                                            port=port)
    db.add(email_notification_source)
    db.flush()
    return email_notification_source

def create_notification(db: Session, 
                        user_id: int, 
                        title: str,
                        content: str, 
                        notification_type: int, 
                        link: str | None = None):
    now = datetime.now(timezone.utc)
    notification = models.notification.Notification(user_id=user_id, 
                                                    title=title,
                                                    content=content, 
                                                    notification_type=notification_type, 
                                                    link=link,
                                                    create_time=now,
                                                    update_time=now)
    db.add(notification)
    db.flush()
    return notification

def get_email_notification_source_by_notification_source_id(db: Session, notification_source_id: int):
    query = db.query(models.notification.EmailNotificationSource)
    query = query.join(models.notification.NotificationSource)
    query = query.filter(models.notification.EmailNotificationSource.notification_source_id == notification_source_id,
                         models.notification.EmailNotificationSource.delete_at == None,
                         models.notification.NotificationSource.delete_at == None)
    return query.first()

def get_notification_source_by_notification_id(db: Session, notification_id: int):
    query = db.query(models.notification.NotificationSource)
    query = query.filter(models.notification.NotificationSource.id == notification_id,
                         models.notification.NotificationSource.delete_at == None)
    return query.first()

def get_notification_source_by_user_id(db: Session, user_id: int):
    query = db.query(models.notification.NotificationSource)
    query = query.filter(models.notification.NotificationSource.user_id == user_id,
                         models.notification.NotificationSource.delete_at == None)
    return query.all()

def get_user_notification_by_notification_id(db: Session, 
                                             user_id: int, 
                                             notification_id: int):
    query = db.query(models.notification.Notification)
    query = query.filter(models.notification.Notification.user_id == user_id,
                         models.notification.Notification.id == notification_id,
                         models.notification.Notification.delete_at == None)
    return query.first()

def search_next_notification(db: Session, 
                             user_id: int, 
                             notification: models.notification.Notification, 
                             keyword: str | None = None):
    query = db.query(models.notification.Notification)

    if keyword is not None and len(keyword) > 0:
        query = query.filter(models.notification.Notification.content.like(f"%{keyword}%"))

    query = query.filter(models.notification.Notification.user_id == user_id, 
                         models.notification.Notification.delete_at == None)
    
    query = query.order_by(models.notification.Notification.create_time.desc())
    
    query = query.filter(models.notification.Notification.create_time < notification.create_time)

    return query.first()

def count_user_notifications(db: Session, 
                             user_id: int, 
                             keyword: str | None = None):
    query = db.query(models.notification.Notification)
    
    if keyword is not None and len(keyword) > 0:
        query = query.filter(or_(models.notification.Notification.content.like(f"%{keyword}%"), 
                                 models.notification.Notification.title.like(f"%{keyword}%")))

    query = query.filter(models.notification.Notification.user_id == user_id,
                         models.notification.Notification.delete_at == None)
    
    return query.count()

def search_user_notifications(db: Session, 
                              user_id: int, 
                              start: int | None = None, 
                              limit: int = 10, 
                              keyword: str | None = None):
    query = db.query(models.notification.Notification)
    
    if keyword is not None and len(keyword) > 0:
        query = query.filter(or_(models.notification.Notification.content.like(f"%{keyword}%"),
                                 models.notification.Notification.title.like(f"%{keyword}%")))
        
    query = query.filter(models.notification.Notification.user_id == user_id,
                         models.notification.Notification.delete_at == None)
    
    query = query.order_by(models.notification.Notification.create_time.desc())

    if start is not None:
        query = query.filter(models.notification.Notification.id <= start)
    
    query = query.limit(limit)
    return query.all()

def read_user_notifications(db: Session, 
                            user_id: int):
    query = db.query(models.notification.Notification)
    query = query.filter(models.notification.Notification.user_id == user_id)
    notifications = query.all()
    for notification in notifications:
        notification.read_at = datetime.now(timezone.utc)
    db.flush()

def read_notifications_by_notification_ids(db: Session, 
                                           user_id: int, 
                                           notification_ids: list[int]):
    query = db.query(models.notification.Notification)
    query = query.filter(models.notification.Notification.id.in_(notification_ids),
                         models.notification.Notification.user_id == user_id)
    notification = query.first()
    notification.read_at = datetime.now(timezone.utc)
    db.flush()
    
def unread_notification_by_notification_id(db: Session, 
                                           user_id: int, 
                                           notification_ids: list[int]):
    query = db.query(models.notification.Notification)
    query = query.filter(models.notification.Notification.id.in_(notification_ids),
                         models.notification.Notification.user_id == user_id)
    notification = query.first()
    notification.read_at = None
    db.flush()
    
def delete_notification_source_by_notification_source_id(db: Session,
                                                         user_id: int,
                                                         notification_source_ids: list[int]):
    now = datetime.now(timezone.utc)
    query = db.query(models.notification.NotificationSource)
    query = query.filter(models.notification.NotificationSource.id.in_(notification_source_ids),
                         models.notification.NotificationSource.user_id == user_id)
    for notification_source in query.all():
        notification_source.delete_at = now
    db.flush()
    
def delete_email_notification_source_by_notification_source_id(db: Session,
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
    
def delete_email_notification_source_by_email_notification_source_id(db: Session,
                                                                     user_id: int,
                                                                     email_notification_source_ids: list[int]):
    now = datetime.now(timezone.utc)
    query = db.query(models.notification.EmailNotificationSource)
    query = query.filter(models.notification.EmailNotificationSource.id.in_(email_notification_source_ids),
                         models.notification.EmailNotificationSource.user_id == user_id)
    for email_source in query.all():
        email_source.delete_at = now
    db.flush()

def delete_user_notifications(db: Session, 
                              user_id: int):
    now = datetime.now(timezone.utc)
    query = db.query(models.notification.Notification)
    query = query.filter(models.notification.Notification.user_id == user_id)
    for notification in query.all():
        notification.delete_at = now
    db.flush()

def delete_notifications_by_notification_ids(db: Session, 
                                             user_id: int,
                                             notification_ids: list[int]):
    now = datetime.now(timezone.utc)
    query = db.query(models.notification.Notification)
    query = query.filter(models.notification.Notification.id.in_(notification_ids),
                         models.notification.Notification.user_id == user_id)
    for notification in query.all():
        notification.delete_at = now
    db.flush()
