import models
from datetime import datetime, timezone
from sqlalchemy.orm import Session

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
