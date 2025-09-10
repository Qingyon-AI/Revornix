import models
from sqlalchemy.orm import Session
from datetime import datetime, timezone

def create_document_embedding_task(db: Session,
                                   user_id: int,
                                   document_id: int):
    now = datetime.now(timezone.utc)
    task = models.task.DocumentEmbeddingTask(user_id=user_id,
                                             status=0,
                                             document_id=document_id,
                                             create_time=now,
                                             update_time=now)
    db.add(task)
    db.flush()
    return task

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

def get_document_embedding_task_by_document_id(db: Session,
                                               document_id: int):
    query = db.query(models.task.DocumentEmbeddingTask)
    query = query.filter(models.task.DocumentEmbeddingTask.document_id == document_id,
                         models.task.DocumentEmbeddingTask.delete_at == None)
    return query.first()

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

def search_document_embedding_tasks(db: Session,
                                    user_id: int,
                                    page_num: int,
                                    page_size: int):
    query = db.query(models.task.DocumentEmbeddingTask)
    query = query.filter(models.task.DocumentEmbeddingTask.user_id == user_id,
                         models.task.DocumentEmbeddingTask.delete_at == None)
    query = query.offset((page_num - 1) * page_size)
    query = query.limit(page_size)
    return query.all()

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
    
def update_document_embedding_task(db: Session,
                                   task_id: int,
                                   status: int):
    now = datetime.now(timezone.utc)
    query = db.query(models.task.DocumentEmbeddingTask)
    query = query.filter(models.task.DocumentEmbeddingTask.id == task_id,
                         models.task.DocumentEmbeddingTask.delete_at == None)
    query.update({models.task.DocumentEmbeddingTask.status: status,
                  models.task.DocumentEmbeddingTask.update_time: now},
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
    
def delete_document_embedding_tasks_by_task_ids(db: Session,
                                                task_ids: list[int]):
    now = datetime.now(timezone.utc)
    query = db.query(models.task.DocumentEmbeddingTask)
    query = query.filter(models.task.DocumentEmbeddingTask.id.in_(task_ids),
                         models.task.DocumentEmbeddingTask.delete_at == None)

    query.update({models.task.DocumentEmbeddingTask.delete_at: now},
                 synchronize_session=False)
    db.flush()