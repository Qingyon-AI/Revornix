from datetime import datetime

import markdown
from apscheduler.events import EVENT_JOB_ERROR, EVENT_JOB_EXECUTED
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

import crud
import schemas
from common.celery.app import start_process_section
from common.logger import exception_logger, info_logger
from data.sql.base import session_scope
from enums.notification import (
    NotificationContentType,
    NotificationTriggerType,
)
from proxy.notification_proxy import NotificationProxy

scheduler = AsyncIOScheduler()

def job_listener(event):
    if event.exception:
        exception_logger.error(f'Job {event.job_id} failed')
    else:
        info_logger.info(f'Job {event.job_id} executed')

async def send_notification_scheduler(
    receiver_id: int,
    notification_task_id: int
):
    db = session_scope()
    try:
        db_notification_task = crud.notification.get_notification_task_by_notification_task_id(
            db=db,
            notification_task_id=notification_task_id
        )
        if db_notification_task is None:
            raise schemas.error.CustomException(message="notification task not found", code=500)

        if db_notification_task.content_type == NotificationContentType.CUSTOM:
            db_notification_content_custom = crud.notification.get_notification_task_content_custom_by_notification_task_id(
                db=db,
                notification_task_id=notification_task_id
            )
            if db_notification_content_custom is None:
                raise schemas.error.CustomException(message="notification content custom not found", code=500)
            title = db_notification_content_custom.title
            content = db_notification_content_custom.content
            link = db_notification_content_custom.link
            cover = db_notification_content_custom.cover
        elif db_notification_task.content_type == NotificationContentType.TEMPLATE:
            db_notification_content_template = crud.notification.get_notification_task_content_template_by_notification_task_id(
                db=db,
                notification_task_id=notification_task_id
            )
            if db_notification_content_template is None:
                raise schemas.error.CustomException(message="notification content template not found", code=500)
            generate_res = await NotificationProxy.create_message_using_template(
                template_id=db_notification_content_template.id,
                params={
                    "receiver_id": receiver_id,
                    "date": datetime.now().date(),
                }
            )
            title = generate_res.title
            content = generate_res.content
            link = generate_res.link
            cover = generate_res.cover

        db_notification_source = crud.notification.get_notification_source_by_id(
            db=db,
            notification_source_id=db_notification_task.notification_source_id
        )
        if db_notification_source is None:
            raise schemas.error.CustomException(message="notification source not found", code=500)
        
        notification_tool = NotificationProxy.create_notification_tool(
            user_id=db_notification_task.creator_id,
            notification_source_id=db_notification_task.notification_source_id,
            notification_target_id=db_notification_task.notification_target_id
        )
        if content:
            content = markdown.markdown(content)
        await notification_tool.send_notification(
            title=title,
            content=content,
            link=link,
            cover=cover
        )
        crud.notification.create_notification_record(
            db=db,
            task_id=notification_task_id,
            title=title,
            content=content,
            link=link,
            cover=cover
        )
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()

scheduler.add_listener(job_listener, EVENT_JOB_EXECUTED | EVENT_JOB_ERROR)

info_logger.info("Restarting all apscheduler tasks...")

db = session_scope()

db_notification_tasks = crud.notification.get_all_notification_tasks(db=db)

# TODO 如果用户任务多了之后 这个任务队列会非常的庞大 极其占用内存 考虑使用缓存优化

for db_notification_task in db_notification_tasks:
    if not db_notification_task.enable or db_notification_task.trigger_type != NotificationTriggerType.SCHEDULER:
        continue
    db_notification_trigger_scheduler = crud.notification.get_notification_task_trigger_scheduler_by_notification_task_id(
        db=db,
        notification_task_id=db_notification_task.id
    )
    if db_notification_trigger_scheduler is None:
        continue
    db_notification_target = crud.notification.get_notification_target_by_id(
        db=db,
        notification_target_id=db_notification_task.notification_target_id
    )
    if db_notification_target is None:
        continue
    scheduler.add_job(
        func=send_notification_scheduler,
        trigger=CronTrigger.from_crontab(db_notification_trigger_scheduler.cron_expr),
        args=[
            db_notification_target.creator_id,
            db_notification_task.id
        ],
        id=str(db_notification_task.id),
        next_run_time=datetime.now()
    )

db_section_trigger_schedulers = crud.task.get_section_process_tasks(
    db=db
)

for db_section, db_section_process_task in db_section_trigger_schedulers:
    db_section_process_task_scheduler = crud.task.get_section_process_trigger_scheduler_by_section_id(
        db=db,
        section_id=db_section.id
    )
    if db_section_process_task_scheduler is None:
        continue
    scheduler.add_job(
        func=start_process_section,
        kwargs={
            "section_id": db_section.id,
            "user_id": db_section.creator_id,
            "auto_podcast": db_section.auto_podcast
        },
        trigger=CronTrigger.from_crontab(db_section_process_task_scheduler.cron_expr),
        id=f"section-process-{db_section.id!s}"
    )

info_logger.info("All apscheduler tasks restarted")

db.close()
