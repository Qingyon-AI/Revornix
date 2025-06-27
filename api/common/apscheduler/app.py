import crud
import asyncio
from common.sql import SessionLocal
from common.logger import info_logger, exception_logger
from common.cron import cron_to_time
from common.notification import union_send_notification
from datetime import datetime
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.events import EVENT_JOB_EXECUTED, EVENT_JOB_ERROR

scheduler = AsyncIOScheduler()

def send_daily_report(user_id: int):
    asyncio.run(union_send_notification(user_id=user_id,
                                        title=f'今日总结已生成，请前往查看',
                                        content='今日总结已生成，请前往查看',
                                        link='/section/today',
                                        notification_type=0))

def job_listener(event):
    if event.exception:
        exception_logger.error(f'Job {event.job_id} failed')
    else:
        info_logger.info(f'Job {event.job_id} executed')

# 当程序启动时，恢复所有任务
def restart_all_tasks():
    info_logger.info("Restarting all tasks...")
    db = SessionLocal()
    # TODO: 恢复所有任务
    # tasks = crud.task.get_all_regular_tasks(db)
    # for task in tasks:
    #     if task.task_type == 1 and task.func_id == 1:
    #         time_obj = datetime.strptime(cron_to_time(task.cron_expr), "%H:%M:%S")
    #         scheduler.add_job(func=lambda user_id: send_daily_report(user_id), 
    #                           args=[task.user_id],
    #                           trigger='cron', 
    #                           id=str(task.id), 
    #                           hour=time_obj.hour,
    #                           minute=time_obj.minute,
    #                           second=time_obj.second)
    # info_logger.info("All tasks restarted")

scheduler.add_listener(job_listener, EVENT_JOB_EXECUTED | EVENT_JOB_ERROR)

restart_all_tasks()