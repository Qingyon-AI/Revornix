from dotenv import load_dotenv
load_dotenv(override=True)
import crud
import httpx
import schemas
import markdown
import feedparser
from enums.section import UserSectionRole, UserSectionAuthority
from common.sql import SessionLocal
from common.logger import info_logger, exception_logger
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.events import EVENT_JOB_EXECUTED, EVENT_JOB_ERROR
from apscheduler.triggers.cron import CronTrigger
from notify.email import EmailNotify
from notify.ios import IOSNotify
from datetime import datetime, timezone
from common.sql import SessionLocal
from notification_template.daily_summary import DailySummaryNotificationTemplate
from common.celery.app import start_process_document
from enums.document import DocumentMdConvertStatus, UserDocumentAuthority
from enums.notification import NotificationContentType, NotificationSourceCategory
from enums.section import SectionDocumentIntegration

scheduler = AsyncIOScheduler()

def job_listener(event):
    if event.exception:
        exception_logger.error(f'Job {event.job_id} failed')
    else:
        info_logger.info(f'Job {event.job_id} executed')

async def fetch_and_save(rss_server: schemas.rss.RssServerInfo):
    response = httpx.get(rss_server.address, timeout=10)
    response.raise_for_status()
    parsed = feedparser.parse(rss_server.address)
    if not parsed.entries:
        return
    db = SessionLocal()
    try:
        for entry in parsed.entries:
            
            description = entry.summary
            
            if len(description) > 500:
                print(f"Warning: description is too long! Truncating to 500 characters.")
                description = description[:500]
            
            # 获取文档的最近更新时间
            entry_published = datetime.strptime(entry.published, "%a, %d %b %Y %H:%M:%S GMT").replace(tzinfo=timezone.utc) if hasattr(entry, "published") else None
            entry_updated = datetime.strptime(entry.updated, "%a, %d %b %Y %H:%M:%S GMT").replace(tzinfo=timezone.utc) if hasattr(entry, "updated") else None

            # TODO: 即使同一个用户，按目前的架构设计，也可能存在多个文档使用了同一个url的情况，因此此处需要修改逻辑，后续考虑当url重复时，直接更新对应文档内容
            existing_doc = crud.document.get_website_document_by_user_id_and_url(db=db, 
                                                                                 user_id=rss_server.user_id, 
                                                                                 url=entry.link)
            
            if existing_doc:
                for section in rss_server.sections:
                    db_exist_section_document = crud.section.get_section_document_by_section_id_and_document_id(db=db,
                                                                                                                section_id=section.id,
                                                                                                                document_id=existing_doc.id)
                    # 如果该文档在rss对应的专栏下不存在，那么就绑定
                    if db_exist_section_document is None:
                        crud.section.create_or_update_section_document(db=db,
                                                                       document_id=existing_doc.id,
                                                                       section_id=section.id,
                                                                       status=SectionDocumentIntegration.WAIT_TO)
                if entry_updated and existing_doc.update_time >= entry_updated:
                    continue
                elif entry_published and existing_doc.update_time >= entry_published:
                    continue
                else:
                    existing_doc.update_time = datetime.now()
                    existing_doc.title = entry.title
                    existing_doc.description = description
                    db.commit()
                    db_website_document = crud.document.get_website_document_by_document_id(db=db, 
                                                                                            document_id=existing_doc.id)
                    # 删除原文档的网页解析信息
                    crud.document.delete_website_document_by_website_document_ids(db=db, 
                                                                                  user_id=existing_doc.creator_id,
                                                                                  website_document_ids=[db_website_document.id])
                    # 创建新解析信息并且绑定到原文档
                    db_new_website_document = crud.document.create_website_document(db=db,
                                                                                    url=entry.link,
                                                                                    document_id=existing_doc.id)
                    db_document_transform_task = crud.task.get_document_transform_task_by_document_id(db=db,
                                                                                                      document_id=existing_doc.id)
                    db_document_transform_task.status = DocumentMdConvertStatus.WAIT_TO
                    db.commit()
                    start_process_document.delay(existing_doc.id, rss_server.user_id, False, True)
            else:
                db_base_document = crud.document.create_base_document(db=db,
                                                                      creator_id=rss_server.user_id,
                                                                      title=entry.title,
                                                                      description=description,
                                                                      category=1,
                                                                      from_plat='rss')
                db_rss_document = crud.rss.create_rss_document(
                    db=db,
                    rss_server_id=rss_server.id,
                    document_id=db_base_document.id
                )
                crud.document.create_user_document(db=db,
                                                    user_id=rss_server.user_id,
                                                    document_id=db_base_document.id,
                                                    authority=UserDocumentAuthority.OWNER)
                db_website_document = crud.document.create_website_document(db=db, 
                                                                            url=entry.link, 
                                                                            document_id=db_base_document.id)
                for section in rss_server.sections:
                    db_section_document = crud.section.create_or_update_section_document(db=db,
                                                                                         document_id=db_base_document.id,
                                                                                         section_id=section.id,
                                                                                         status=SectionDocumentIntegration.WAIT_TO)
                crud.task.create_document_transform_task(db=db,
                                                         user_id=rss_server.user_id,
                                                         document_id=db_base_document.id)
                db.commit()
                start_process_document.delay(db_base_document.id, rss_server.user_id)
    except Exception as e:
        exception_logger.error(f'Error while fetching and saving rss server {rss_server.id}: {e}')
        db.rollback()
    finally:
        db.close()

async def fetch_all_rss_sources_and_update():
    now = datetime.now(tz=timezone.utc)
    db = SessionLocal()
    # TODO: 当rss过多的时候，会导致内存爆炸，考虑使用next迭代器，每次只获取一个rss
    db_rss_servers = crud.rss.get_all_rss_servers(db=db)
    for rss_server in db_rss_servers:
        rss_server_info = schemas.rss.RssServerInfo.model_validate(rss_server)
        rss_server_info.sections = []
        
        # get the section of the user on the current day
        db_user_day_section = crud.section.get_section_by_user_and_date(db=db, 
                                                                        user_id=rss_server.user_id,
                                                                        date=datetime.now().date().isoformat())
        if db_user_day_section is None:
            db_user_day_section = crud.section.create_section(db=db, 
                                                              creator_id=rss_server.user_id,
                                                              title=f'{now.date().isoformat()} Summary',
                                                              description=f"This document is the summary of all documents on {now.date().isoformat()}.")
            crud.section.create_section_user(db=db,
                                             section_id=db_user_day_section.id,
                                             user_id=rss_server.user_id,
                                             role=UserSectionRole.CREATOR,
                                             authority=UserSectionAuthority.FULL_ACCESS)
            crud.section.create_date_section(
                db=db,
                section_id=db_user_day_section.id,
                date=now.date()
            )
            db.commit()
        rss_server_info.sections.append(schemas.rss.RssSectionInfo.model_validate(db_user_day_section))
        
        db_rss_sections = crud.rss.get_sections_by_rss_server_id(db=db, rss_server_id=rss_server.id)
        for db_rss_section in db_rss_sections:
            rss_server_info.sections.append(schemas.rss.RssSectionInfo.model_validate(db_rss_section))
        await fetch_and_save(rss_server_info)
    db.close()

async def send_notification(user_id:int,
                            notification_task_id: int | None = None):
    db = SessionLocal()
    db_notification_task = crud.notification.get_notification_task_by_notification_task_id(db=db,
                                                                                           notification_task_id=notification_task_id)
    if db_notification_task is None:
        raise schemas.error.CustomException(message="notification task not found", code=404)
    if db_notification_task.notification_content_type == NotificationContentType.CUSTOM:
        db_notification_content_custom = crud.notification.get_notification_task_content_custom_by_notification_task_id(db=db,
                                                                                                                        notification_task_id=notification_task_id)
        title = db_notification_content_custom.title
        content = db_notification_content_custom.content
    elif db_notification_task.notification_content_type == NotificationContentType.TEMPLATE:
        db_notification_content_template = crud.notification.get_notification_task_content_template_by_notification_task_id(db=db,
                                                                                                                            notification_task_id=notification_task_id)
        if db_notification_content_template.notification_template_id == NotificationContentType.TEMPLATE:
            template = DailySummaryNotificationTemplate()
            template.init_user(user_id=user_id)
            generate_res = await template.generate()
            title = generate_res.title
            content = generate_res.content
    db_notification_source = crud.notification.get_notification_source_by_notification_source_id(db=db,
                                                                                                 notification_source_id=db_notification_task.notification_source_id)
    db_notification_target = crud.notification.get_notification_target_by_notification_target_id(db=db,
                                                                                                 notification_target_id=db_notification_task.notification_target_id)
    send_res = None
    if db_notification_source.category == NotificationSourceCategory.EMAIL:
        email_notify = EmailNotify(source_id=db_notification_task.notification_source_id,
                                   target_id=db_notification_task.notification_target_id)
        send_res = email_notify.send_notification(message=schemas.notification.Message(title=title,
                                                                                       content=markdown.markdown(content)))
    if db_notification_source.category == NotificationSourceCategory.IOS:
        ios_notify = IOSNotify(source_id=db_notification_task.notification_source_id,
                               target_id=db_notification_task.notification_target_id)
        send_res = ios_notify.send_notification(message=schemas.notification.Message(title=title,
                                                                                     content=content))
    if not send_res:
        raise schemas.error.CustomException(message="send notification failed", code=500)
    else:
        crud.notification.create_notification_record(db=db,
                                                     user_id=user_id,
                                                     title=title,
                                                     content=content,
                                                     notification_source_id=db_notification_task.notification_source_id,
                                                     notification_target_id=db_notification_task.notification_target_id)
        db.commit()
    db.close()  

scheduler.add_listener(job_listener, EVENT_JOB_EXECUTED | EVENT_JOB_ERROR)

info_logger.info("Restarting all apscheduler tasks...")

db = SessionLocal()

db_notification_tasks = crud.notification.get_all_notification_tasks(db=db)

# TODO 如果用户任务多了之后 这个任务队列会非常的庞大 极其占用内存 考虑使用缓存优化

for db_notification_task in db_notification_tasks:
    if not db_notification_task.enable or not db_notification_task.cron_expr: 
        continue
    scheduler.add_job(
        func=send_notification,
        trigger=CronTrigger.from_crontab(db_notification_task.cron_expr),
        args=[db_notification_task.user_id,
                db_notification_task.id],
        id=str(db_notification_task.id),
        next_run_time=datetime.now()
    )
    
scheduler.add_job(
    func=fetch_all_rss_sources_and_update,
    trigger=CronTrigger.from_crontab("0 * * * *"),
    id="fetch_all_rss_sources",
    next_run_time=datetime.now(tz=timezone.utc)
)

info_logger.info("All apscheduler tasks restarted")

db.close()

# if __name__ == '__main__':
#     async def main():
#         await fetch_all_rss_sources()
#     import asyncio
#     asyncio.run(main())