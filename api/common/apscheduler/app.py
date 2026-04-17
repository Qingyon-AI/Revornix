from datetime import datetime, timezone
import json
from zoneinfo import ZoneInfo

from apscheduler.events import EVENT_JOB_ERROR, EVENT_JOB_EXECUTED
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

import crud
import schemas
from common.celery.app import start_process_section
from common.logger import exception_logger, format_log_message, info_logger
from common.section_schedule import build_day_section_trigger
from common.timezone import (
    decode_cron_expr_with_timezone,
    get_cached_user_timezone,
    normalize_timezone_name,
    today_in_timezone,
)
from data.sql.base import session_scope
from enums.notification import (
    NotificationContentType,
    NotificationTriggerType,
)
from notification.template.platform_message_builder import build_multi_platform_message
from proxy.notification_proxy import NotificationProxy

scheduler = AsyncIOScheduler()


def _resolve_scheduler_template_params(
    *,
    receiver_id: int,
    base_params: dict[str, object],
    bindings_json: str | None,
) -> dict[str, object]:
    resolved_params: dict[str, object] = {
        "receiver_id": receiver_id,
        **base_params,
    }
    if not bindings_json:
        return resolved_params
    try:
        bindings = json.loads(bindings_json)
    except json.JSONDecodeError:
        return resolved_params
    if not isinstance(bindings, dict):
        return resolved_params
    for key, binding in bindings.items():
        if not isinstance(binding, dict):
            continue
        if binding.get("source_type") == "static":
            resolved_params[key] = binding.get("static_value")
        elif binding.get("source_type") == "event":
            attribute_key = binding.get("attribute_key")
            if isinstance(attribute_key, str) and attribute_key:
                resolved_params[key] = resolved_params.get(attribute_key)
    return resolved_params

def job_listener(event):
    if event.exception:
        exception_logger.error(
            format_log_message("apscheduler_job_failed", job_id=event.job_id)
        )
    else:
        info_logger.info(
            format_log_message("apscheduler_job_executed", job_id=event.job_id)
        )

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
            raise schemas.error.CustomException(message="Notification task not found", code=500)

        notification_tool = NotificationProxy.create_notification_tool(
            user_id=db_notification_task.creator_id,
            notification_source_id=db_notification_task.notification_source_id,
            notification_target_id=db_notification_task.notification_target_id
        )
        if db_notification_task.content_type == NotificationContentType.CUSTOM:
            db_notification_content_custom = crud.notification.get_notification_task_content_custom_by_notification_task_id(
                db=db,
                notification_task_id=notification_task_id
            )
            if db_notification_content_custom is None:
                raise schemas.error.CustomException(message="Custom notification content not found", code=500)
            message = build_multi_platform_message(
                title=db_notification_content_custom.title,
                plain_content=db_notification_content_custom.content or "",
                link=db_notification_content_custom.link,
                cover=db_notification_content_custom.cover,
            )
        elif db_notification_task.content_type == NotificationContentType.TEMPLATE:
            db_notification_content_template = crud.notification.get_notification_task_content_template_by_notification_task_id(
                db=db,
                notification_task_id=notification_task_id
            )
            if db_notification_content_template is None:
                raise schemas.error.CustomException(message="Notification content template not found", code=500)
            receiver_timezone = await get_cached_user_timezone(receiver_id)
            message = await NotificationProxy.create_message_using_template(
                template_id=db_notification_content_template.notification_template_id,
                params=_resolve_scheduler_template_params(
                    receiver_id=receiver_id,
                    base_params={
                        "date": today_in_timezone(receiver_timezone),
                    },
                    bindings_json=db_notification_content_template.parameter_bindings_json,
                ),
            )
        else:
            raise schemas.error.CustomException(message="Unsupported notification content type", code=500)

        resolved_message = NotificationProxy.resolve_message_for_channel(
            message=message,
            channel_key=notification_tool.channel_key
        )
        title = resolved_message.title
        content = resolved_message.content
        content_type = resolved_message.content_type
        plain_content = resolved_message.plain_content
        link = resolved_message.link
        cover = resolved_message.cover

        db_notification_source = crud.notification.get_notification_source_by_id(
            db=db,
            notification_source_id=db_notification_task.notification_source_id
        )
        if db_notification_source is None:
            raise schemas.error.CustomException(message="Notification source not found", code=500)

        await notification_tool.send_notification(
            title=title,
            content=content,
            content_type=content_type,
            plain_content=plain_content,
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

info_logger.info(format_log_message("apscheduler_restart_started"))

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
        next_run_time=datetime.now(timezone.utc)
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
    timezone_name, cron_expr = decode_cron_expr_with_timezone(
        db_section_process_task_scheduler.cron_expr
    )
    if cron_expr is None:
        continue
    db_day_section = crud.section.get_day_section_by_section_id(
        db=db,
        section_id=db_section.id,
    )
    if db_day_section is not None:
        trigger = build_day_section_trigger(
            section_date=db_day_section.date,
            cron_expr=cron_expr,
            timezone_name=timezone_name,
        )
        if trigger is None:
            continue
    else:
        trigger = CronTrigger.from_crontab(
            cron_expr,
            timezone=ZoneInfo(normalize_timezone_name(timezone_name)),
        )
    scheduler.add_job(
        func=start_process_section,
        kwargs={
            "section_id": db_section.id,
            "user_id": db_section.creator_id,
            "auto_podcast": db_section.auto_podcast
        },
        trigger=trigger,
        id=f"section-process-{db_section.id!s}"
    )

info_logger.info(format_log_message("apscheduler_restart_finished"))

db.close()
