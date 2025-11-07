import models
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from enums.document import DocumentGraphStatus

def create_document_graph_task(db: Session,
                               user_id: int,
                               document_id: int):
    now = datetime.now(timezone.utc)
    task = models.task.DocumentGraphTask(user_id=user_id,
                                         status=DocumentGraphStatus.WAIT_TO,
                                         document_id=document_id,
                                         create_time=now,
                                         update_time=now)
    db.add(task)
    db.flush()
    return task

def create_document_process_task(db: Session,
                                 user_id: int,
                                 document_id: int):
    now = datetime.now(timezone.utc)
    task = models.task.DocumentProcessTask(user_id=user_id,
                                           status=DocumentGraphStatus.WAIT_TO,
                                           document_id=document_id,
                                           create_time=now,
                                           update_time=now)
    db.add(task)
    db.flush()
    return task

def create_document_embedding_task(db: Session,
                                   user_id: int,
                                   document_id: int):
    now = datetime.now(timezone.utc)
    task = models.task.DocumentEmbeddingTask(user_id=user_id,
                                             status=DocumentGraphStatus.WAIT_TO,
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
                                                 status=DocumentGraphStatus.WAIT_TO,
                                                 document_id=document_id,
                                                 create_time=now,
                                                 update_time=now)
    db.add(task)
    db.flush()
    return task

def get_document_graph_task_by_document_id(db: Session,
                                           document_id: int):
    query = db.query(models.task.DocumentGraphTask)
    query = query.filter(models.task.DocumentGraphTask.document_id == document_id,
                         models.task.DocumentGraphTask.delete_at == None)
    return query.first()

def get_document_process_task_by_document_id(db: Session,
                                             document_id: int):
    query = db.query(models.task.DocumentProcessTask)
    query = query.filter(models.task.DocumentProcessTask.document_id == document_id,
                         models.task.DocumentProcessTask.delete_at == None)
    return query.first()

def get_document_podcast_task_by_document_id(db: Session,
                                             document_id: int):
    query = db.query(models.task.DocumentPodcastTask)
    query = query.filter(models.task.DocumentPodcastTask.document_id == document_id,
                         models.task.DocumentPodcastTask.delete_at == None)
    return query.first()

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

def search_document_graph_tasks(db: Session,
                                user_id: int,
                                page_num: int,
                                page_size: int):
    query = db.query(models.task.DocumentGraphTask)
    query = query.filter(models.task.DocumentGraphTask.user_id == user_id,
                         models.task.DocumentGraphTask.delete_at == None)
    query = query.offset((page_num - 1) * page_size)
    query = query.limit(page_size)
    return query.all()

def search_document_process_tasks(db: Session,
                                  user_id: int,
                                  page_num: int,
                                  page_size: int):
    query = db.query(models.task.DocumentProcessTask)
    query = query.filter(models.task.DocumentProcessTask.user_id == user_id,
                         models.task.DocumentProcessTask.delete_at == None)
    query = query.offset((page_num - 1) * page_size)
    query = query.limit(page_size)
    return query.all()

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

def search_document_podcast_tasks(db: Session,
                                  user_id: int,
                                  page_num: int,
                                  page_size: int):
    query = db.query(models.task.DocumentPodcastTask)
    query = query.filter(models.task.DocumentPodcastTask.user_id == user_id,
                         models.task.DocumentPodcastTask.delete_at == None)
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
    
def delete_document_graph_tasks_by_task_ids(db: Session,
                                            task_ids: list[int]):
    now = datetime.now(timezone.utc)
    query = db.query(models.task.DocumentGraphTask)
    query = query.filter(models.task.DocumentGraphTask.id.in_(task_ids),
                         models.task.DocumentGraphTask.delete_at == None)
    
    query.update({models.task.DocumentGraphTask.delete_at: now},
                 synchronize_session=False)
    db.flush()
    
def delete_document_process_tasks_by_task_ids(db: Session,
                                              task_ids: list[int]):
    now = datetime.now(timezone.utc)
    query = db.query(models.task.DocumentProcessTask)
    query = query.filter(models.task.DocumentProcessTask.id.in_(task_ids),
                         models.task.DocumentProcessTask.delete_at == None)

    query.update({models.task.DocumentProcessTask.delete_at: now},
                 synchronize_session=False)
    db.flush()