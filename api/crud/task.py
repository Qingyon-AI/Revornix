import models
from sqlalchemy.orm import Session
from datetime import datetime, timezone

def create_document_transform_task(db: Session,
                                   user_id: int,
                                   document_id: int):
    now = datetime.now(timezone.utc)
    task = models.task.DocumentTransformToMdTask(user_id=user_id,
                                                 status=0,
                                                 document_id=document_id,
                                                 create_time=now,
                                                 update_time=now)
    db.add(task)
    db.flush()
    return task
    
def create_interval_task(db: Session,
                         user_id: int,
                         interval: int,
                         title: str,
                         func_id: int,
                         description: str):
    now = datetime.now(timezone.utc)
    task = models.task.RegularTask(title=title, 
                                   user_id=user_id,
                                   description=description,
                                   interval=interval,
                                   task_type=1,
                                   func_id=func_id,
                                   create_time=now,
                                   update_time=now)
    db.add(task)
    db.flush()
    return task

def create_cron_task(db: Session,
                     user_id: int,
                     cron_expr: str,
                     title: str,
                     func_id: int,
                     description: str | None = None):
    now = datetime.now(timezone.utc)
    task = models.task.RegularTask(title=title, 
                                   user_id=user_id,
                                   description=description,
                                   cron_expr=cron_expr,
                                   task_type=1,
                                   func_id=func_id,
                                   create_time=now,
                                   update_time=now)
    db.add(task)
    db.flush()
    return task

def get_document_transform_task_by_document_id(db: Session,
                                               document_id: int):
    query = db.query(models.task.DocumentTransformToMdTask)
    query = query.filter(models.task.DocumentTransformToMdTask.document_id == document_id,
                         models.task.DocumentTransformToMdTask.delete_at == None)
    return query.first()

def search_document_transform_tasks(db: Session,
                                    user_id: int,
                                    page_num: int,
                                    page_size: int):
    query = db.query(models.task.DocumentTransformToMdTask)
    query = query.filter(models.task.DocumentTransformToMdTask.user_id == user_id,
                         models.task.DocumentTransformToMdTask.delete_at == None)
    query = query.offset((page_num - 1) * page_size)
    query = query.limit(page_size)
    return query.all()

def get_all_regular_tasks(db: Session):
    query = db.query(models.task.RegularTask)
    query = query.filter(models.task.RegularTask.delete_at == None)
    return query.all()

def get_user_daily_report_task(db: Session,
                               user_id: int):
    query = db.query(models.task.RegularTask)
    query = query.filter(models.task.RegularTask.user_id == user_id,
                         models.task.RegularTask.title == '每日报告',
                         models.task.RegularTask.delete_at == None)
    return query.first()

def search_regular_tasks_by_user_id(db: Session,
                                    user_id: int,
                                    page_num: int,
                                    page_size: int,
                                    keyword: str | None = None):
    query = db.query(models.task.RegularTask)
    query = query.filter(models.task.RegularTask.user_id == user_id,
                         models.task.RegularTask.delete_at == None)
    if keyword is not None and len(keyword) > 0:
        query = query.filter(models.task.RegularTask.title.like(f"%{keyword}%"))
    query = query.offset((page_num - 1) * page_size)
    query = query.limit(page_size)
    return query.all()

def count_regular_tasks_by_user_id(db: Session,
                                   user_id: int,
                                   keyword: str | None = None):
    query = db.query(models.task.RegularTask)
    query = query.filter(models.task.RegularTask.user_id == user_id,
                         models.task.RegularTask.delete_at == None)
    if keyword is not None and len(keyword) > 0:
        query = query.filter(models.task.RegularTask.title.like(f"%{keyword}%"))
    return query.count()

def get_regular_task_by_task_id(db: Session,
                                task_id: int):
    query = db.query(models.task.RegularTask)
    query = query.filter(models.task.RegularTask.id == task_id,
                         models.task.RegularTask.delete_at == None)
    return query.first()

def update_document_transform_task(db: Session,
                                   task_id: int,
                                   status: int):
    now = datetime.now(timezone.utc)
    query = db.query(models.task.DocumentTransformToMdTask)
    query = query.filter(models.task.DocumentTransformToMdTask.id == task_id,
                         models.task.DocumentTransformToMdTask.delete_at == None)
    query.update({models.task.DocumentTransformToMdTask.status: status,
                  models.task.DocumentTransformToMdTask.update_time: now},
                 synchronize_session=False)
    db.flush()

def delete_document_transform_tasks_by_task_ids(db: Session,
                                                task_ids: list[int]):
    now = datetime.now(timezone.utc)
    query = db.query(models.task.DocumentTransformToMdTask)
    query = query.filter(models.task.DocumentTransformToMdTask.id.in_(task_ids),
                         models.task.DocumentTransformToMdTask.delete_at == None)
    query.update({models.task.DocumentTransformToMdTask.delete_at: now},
                 synchronize_session=False)
    db.flush()

def delete_regular_tasks_by_task_ids(db: Session, 
                                     user_id: int,
                                     task_ids: list[int]):
    now = datetime.now(timezone.utc)
    query = db.query(models.task.RegularTask)
    query = query.filter(models.task.RegularTask.id.in_(task_ids),
                         models.task.RegularTask.delete_at == None,
                         models.task.RegularTask.user_id == user_id)
    query.update({'delete_at': now}, synchronize_session=False)
    db.flush()