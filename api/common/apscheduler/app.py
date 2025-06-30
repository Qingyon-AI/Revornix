import crud
import schemas
from common.sql import SessionLocal
from common.logger import info_logger, exception_logger
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.events import EVENT_JOB_EXECUTED, EVENT_JOB_ERROR
from apscheduler.triggers.cron import CronTrigger
from notify.email import EmailNotify
from datetime import datetime

scheduler = AsyncIOScheduler()

def job_listener(event):
    if event.exception:
        exception_logger.error(f'Job {event.job_id} failed')
    else:
        info_logger.info(f'Job {event.job_id} executed')

async def send_notification(user_id:int,
                            notification_source_id: int, 
                            notification_target_id: int, 
                            title: str, 
                            content: str):
    db = SessionLocal()
    db_notification_source = crud.notification.get_notification_source_by_notification_source_id(db=db,
                                                                                                 notification_source_id=notification_source_id)
    db_notification_target = crud.notification.get_notification_target_by_notification_target_id(db=db,
                                                                                                 notification_target_id=notification_target_id)
    if db_notification_source is None or db_notification_target is None:
        raise schemas.error.CustomException(message="notification source or target not found", code=404)
    if db_notification_source.category == 0:
        db_notification_email_source = crud.notification.get_email_notification_source_by_notification_source_id(db=db,
                                                                                                                 notification_source_id=db_notification_source.id)
    if db_notification_target.category == 0:
        db_notification_email_target = crud.notification.get_email_notification_target_by_notification_target_id(db=db,
                                                                                                                 notification_target_id=db_notification_target.id)
    email_notify = EmailNotify(
        source=schemas.notification.NotificationSourceDetail(
            id=db_notification_source.id,
            title=db_notification_source.title,
            description=db_notification_source.description,
            category=db_notification_source.category,
            email_notification_source=schemas.notification.EmailNotificationSource(
                id=db_notification_email_source.id,
                email=db_notification_email_source.email,
                password=db_notification_email_source.password,
                port=db_notification_email_source.port,
                server=db_notification_email_source.server,
            )
        ),
        target=schemas.notification.NotificationTargetDetail(
            id=db_notification_target.id,
            title=db_notification_target.title,
            description=db_notification_target.description,
            category=db_notification_target.category,
            email_notification_target=schemas.notification.EmailNotificationTarget(
                id=db_notification_email_target.id,
                email=db_notification_email_target.email,
            )
        )
    )
    send_res = email_notify.send_notification(message=schemas.notification.Message(title=title,
                                                                                   content=content))
    if not send_res:
        raise schemas.error.CustomException(message="send notification failed", code=500)
    else:
        crud.notification.create_notification_record(db=db,
                                                     user_id=user_id,
                                                     title=title,
                                                     content=content,
                                                     notification_source_id=notification_source_id,
                                                     notification_target_id=notification_target_id)
        db.commit()
        

# restart all tasks when the program starts
def restart_all_tasks():
    info_logger.info("Restarting all tasks...")
    db = SessionLocal()
    db_notification_tasks = crud.notification.get_all_notification_tasks(db=db)
    for db_notification_task in db_notification_tasks:
        if not db_notification_task.enable: 
            continue
        scheduler.add_job(
            func=send_notification,
            trigger=CronTrigger.from_crontab(db_notification_task.cron_expr),
            args=[db_notification_task.user_id,
                  db_notification_task.notification_source_id,
                  db_notification_task.notification_target_id,
                  db_notification_task.title,
                  db_notification_task.content],
            id=str(db_notification_task.id),
            next_run_time=datetime.now()
        )
    info_logger.info("All tasks restarted")

scheduler.add_listener(job_listener, EVENT_JOB_EXECUTED | EVENT_JOB_ERROR)

restart_all_tasks()