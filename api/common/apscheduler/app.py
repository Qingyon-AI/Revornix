from datetime import datetime, timezone

import feedparser
import httpx
import markdown
from apscheduler.events import EVENT_JOB_ERROR, EVENT_JOB_EXECUTED
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

import crud
import schemas
from common.celery.app import start_process_document, start_process_section
from common.logger import exception_logger, info_logger, warning_logger
from data.sql.base import session_scope
from enums.document import DocumentCategory, UserDocumentAuthority
from enums.notification import (
    NotificationContentType,
    NotificationTriggerType,
    NotificationSourceProvided,
    NotificationTemplate
)
from enums.section import SectionDocumentIntegration, UserSectionAuthority, UserSectionRole
from notification.template.daily_summary import DailySummaryNotificationTemplate
from proxy.notification_proxy import NotificationProxy

scheduler = AsyncIOScheduler()

def job_listener(event):
    if event.exception:
        exception_logger.error(f'Job {event.job_id} failed')
    else:
        info_logger.info(f'Job {event.job_id} executed')

async def fetch_and_save(
    rss_server: schemas.rss.RssServerInfo
):
    async with httpx.AsyncClient(timeout=15, follow_redirects=True) as client:
        response = await client.get(rss_server.address)
        response.raise_for_status()
    parsed = feedparser.parse(response.content)
    if not parsed.entries:
        return
    db = session_scope()
    try:
        for entry in parsed.entries:

            description = entry.summary

            if len(description) > 500:
                warning_logger.warning("Warning: description is too long! Truncating to 500 characters.")
                description = description[:500]

            # 获取文档的最近更新时间
            entry_published = datetime.strptime(entry.published, "%a, %d %b %Y %H:%M:%S GMT").replace(tzinfo=timezone.utc) if hasattr(entry, "published") else None
            entry_updated = datetime.strptime(entry.updated, "%a, %d %b %Y %H:%M:%S GMT").replace(tzinfo=timezone.utc) if hasattr(entry, "updated") else None

            # TODO: 即使同一个用户，按目前的架构设计，也可能存在多个文档使用了同一个url的情况，因此此处需要修改逻辑，后续考虑当url重复时，直接更新对应文档内容
            existing_doc = crud.document.get_website_document_by_user_id_and_url(
                db=db,
                user_id=rss_server.user_id,
                url=entry.link
            )
            rss_server.sections = list(dict.fromkeys(
                rss_server.sections
            ))
            if existing_doc:
                for section in rss_server.sections:
                    db_exist_section_document = crud.section.get_section_document_by_section_id_and_document_id(
                        db=db,
                        section_id=section.id,
                        document_id=existing_doc.id
                    )
                    # 如果该文档在rss对应的专栏下不存在，那么就绑定
                    if db_exist_section_document is None:
                        crud.section.create_or_update_section_document(
                            db=db,
                            document_id=existing_doc.id,
                            section_id=section.id,
                            status=SectionDocumentIntegration.WAIT_TO
                        )
                if (entry_updated and existing_doc.update_time and existing_doc.update_time >= entry_updated) or (entry_published and existing_doc.update_time and existing_doc.update_time >= entry_published):
                    continue
                existing_doc.update_time = datetime.now()
                existing_doc.title = entry.title
                existing_doc.description = description
                db.commit()
                db_document_convert_task = crud.task.get_document_convert_task_by_document_id(
                    db=db,
                    document_id=existing_doc.id
                )
                if db_document_convert_task:
                    crud.task.delete_document_convert_task_by_document_ids(
                        db=db,
                        user_id=rss_server.user_id,
                        document_ids=[db_document_convert_task.document_id]
                    )
                db.commit()
                start_process_document.delay(
                    document_id=existing_doc.id,
                    user_id=rss_server.user_id,
                    auto_summary=False,
                    auto_podcast=False
                )
            else:
                db_base_document = crud.document.create_base_document(
                    db=db,
                    creator_id=rss_server.user_id,
                    title=entry.title,
                    description=description,
                    category=DocumentCategory.WEBSITE,
                    from_plat='rss'
                )
                crud.document.create_website_document(
                    db=db,
                    url=entry.link,
                    document_id=db_base_document.id
                )
                crud.rss.create_rss_document(
                    db=db,
                    rss_server_id=rss_server.id,
                    document_id=db_base_document.id
                )
                crud.document.create_user_document(
                    db=db,
                    user_id=rss_server.user_id,
                    document_id=db_base_document.id,
                    authority=UserDocumentAuthority.OWNER
                )
                for section in rss_server.sections:
                    crud.section.create_or_update_section_document(
                        db=db,
                        document_id=db_base_document.id,
                        section_id=section.id,
                        status=SectionDocumentIntegration.WAIT_TO
                    )
                db.commit()
                start_process_document.delay(
                    document_id=db_base_document.id,
                    user_id=rss_server.user_id,
                    auto_summary=False,
                    auto_podcast=False
                )
    except Exception as e:
        exception_logger.error(f'Error while fetching and saving rss server {rss_server.id}: {e}')
        db.rollback()
    finally:
        db.close()

async def fetch_all_rss_sources_and_update():
    now = datetime.now(tz=timezone.utc)
    db = session_scope()
    try:
        # TODO: 当rss过多的时候，会导致内存爆炸，考虑使用next迭代器，每次只获取一个rss
        db_rss_servers = crud.rss.get_all_rss_servers(
            db=db
        )
        for rss_server in db_rss_servers:
            rss_server_info = schemas.rss.RssServerInfo.model_validate(rss_server)
            rss_server_info.sections = []

            # get the section of the user on the current day
            db_user_day_section = crud.section.get_section_by_user_and_date(
                db=db,
                user_id=rss_server.user_id,
                date=datetime.now().date()
            )
            if db_user_day_section is None:
                db_user_day_section = crud.section.create_section(
                    db=db,
                    creator_id=rss_server.user_id,
                    title=f'{now.date().isoformat()} Summary',
                    description=f"This document is the summary of all documents on {now.date().isoformat()}."
                )
                crud.section.create_section_user(
                    db=db,
                    section_id=db_user_day_section.id,
                    user_id=rss_server.user_id,
                    role=UserSectionRole.CREATOR,
                    authority=UserSectionAuthority.FULL_ACCESS
                )
                crud.section.create_date_section(
                    db=db,
                    section_id=db_user_day_section.id,
                    date=now.date()
                )
                db.commit()
            rss_server_info.sections.append(
                schemas.rss.RssSectionInfo.model_validate(db_user_day_section)
            )

            db_rss_sections = crud.rss.get_sections_by_rss_server_id(
                db=db,
                rss_server_id=rss_server.id
            )
            for db_rss_section in db_rss_sections:
                rss_server_info.sections.append(
                    schemas.rss.RssSectionInfo.model_validate(db_rss_section)
                )
            await fetch_and_save(rss_server_info)
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()

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
            generate_res = await NotificationProxy.create_message_using_template(
                template_id=db_notification_task.notification_template_id,
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

scheduler.add_job(
    func=fetch_all_rss_sources_and_update,
    trigger=CronTrigger.from_crontab("0 * * * *"),
    id="fetch_all_rss_sources",
    next_run_time=datetime.now(tz=timezone.utc)
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

# if __name__ == '__main__':
#     async def main():
#         await fetch_all_rss_sources()
#     import asyncio
#     asyncio.run(main())
