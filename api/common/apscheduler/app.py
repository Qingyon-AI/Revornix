from zoneinfo import ZoneInfo

from apscheduler.events import EVENT_JOB_ERROR, EVENT_JOB_EXECUTED
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

import crud
from common.celery.app import start_process_section
from common.logger import exception_logger, format_log_message, info_logger
from common.section_schedule import build_day_section_trigger
from common.timezone import (
    decode_cron_expr_with_timezone,
    normalize_timezone_name,
)
from data.sql.base import async_session_context

scheduler = AsyncIOScheduler()


def job_listener(event):
    if event.exception:
        exception_logger.error(
            format_log_message("apscheduler_job_failed", job_id=event.job_id)
        )
    else:
        info_logger.info(
            format_log_message("apscheduler_job_executed", job_id=event.job_id)
        )


scheduler.add_listener(job_listener, EVENT_JOB_EXECUTED | EVENT_JOB_ERROR)


async def initialize_scheduler_jobs() -> None:
    info_logger.info(format_log_message("apscheduler_restart_started"))

    async with async_session_context() as db:
        db_section_trigger_schedulers = await crud.task.get_section_process_tasks_async(db=db)

        for db_section, _db_section_process_task in db_section_trigger_schedulers:
            db_section_process_task_scheduler = await crud.task.get_section_process_trigger_scheduler_by_section_id_async(
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
            db_day_section = await crud.section.get_day_section_by_section_id_async(
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
