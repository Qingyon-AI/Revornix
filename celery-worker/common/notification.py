import crud
from common.sql import SessionLocal
from common.mail import send_email
from common.logger import log_exception, exception_logger

async def union_send_notification(user_id: int, 
                                  title: str, 
                                  content: str, 
                                  link: str, 
                                  notification_type: str):
    try:
        db = SessionLocal()
        user = crud.user.get_user_by_id(db=db, 
                                        user_id=user_id)
        db_notification_record = crud.notification.create_notification_record(db=db, 
                                                                              user_id=user_id,
                                                                              title=title,
                                                                              content=content,
                                                                              notification_type=notification_type,
                                                                              link=link)
        email_user = crud.user.get_email_user_by_user_id(db=db, 
                                                         user_id=user_id)
        if email_user:
            # 邮件发送消息
            send_email(email_user.email, title, content)
        db.commit()
    except Exception as e:
        exception_logger.error(f"记载报错，错误{e}")
        log_exception()
        db.rollback()