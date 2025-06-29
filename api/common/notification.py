import crud
import json
from fastapi.encoders import jsonable_encoder
from common.sql import SessionLocal
from common.websocket import notificationManager
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
        db_notification = crud.notification.create_notification_record(db=db, 
                                                                       user_id=user_id,
                                                                       title=title,
                                                                       content=content,
                                                                       notification_type=notification_type,
                                                                       link=link)
        user_websocket = notificationManager.get_connection(user.uuid)
        if user_websocket:
            # 网站端发送消息
            await user_websocket.send_text(json.dumps({"type": "notification", "notification": jsonable_encoder(db_notification)}, ensure_ascii=False))
        email_user = crud.user.get_email_user_by_user_id(db=db, 
                                                         user_id=user_id)
        if email_user:
            # TODO: 邮件发送消息
            ...
        db.commit()
    except Exception as e:
        exception_logger.error(f"记载报错，错误{e}")
        log_exception()
        db.rollback()