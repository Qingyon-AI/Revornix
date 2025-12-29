import models
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from enums.document import DocumentGraphStatus, DocumentPodcastStatus, DocumentEmbeddingStatus, DocumentProcessStatus, DocumentMdConvertStatus
from enums.section import SectionPodcastStatus, SectionProcessStatus, SectionProcessTriggerType

def create_section_process_task_trigger_scheduler(
    db: Session,
    section_process_task_id: int,
    cron_expr: str
):
    scheduler = models.task.SectionTriggerScheduler(
        section_process_task_id=section_process_task_id,
        cron_expr=cron_expr
    )
    db.add(scheduler)
    db.flush()
    return scheduler

def create_section_process_task(
    db: Session,
    user_id: int,
    section_id: int,
    status: SectionProcessStatus = SectionProcessStatus.WAIT_TO,
    trigger_type: SectionProcessTriggerType = SectionProcessTriggerType.UPDATED
):
    now = datetime.now(timezone.utc)
    task = models.task.SectionProcessTask(
        user_id=user_id,
        status=status,
        section_id=section_id,
        create_time=now,
        trigger_type=trigger_type
    )
    db.add(task)
    db.flush()
    return task

def create_section_podcast_task(
    db: Session,
    user_id: int,
    section_id: int,
    status: SectionPodcastStatus = SectionPodcastStatus.WAIT_TO
):
    now = datetime.now(timezone.utc)
    task = models.task.SectionPodcastTask(user_id=user_id,
                                          status=status,
                                          section_id=section_id,
                                          create_time=now)
    db.add(task)
    db.flush()
    return task

def create_document_podcast_task(
    db: Session,
    user_id: int,
    document_id: int,
    status: DocumentPodcastStatus = DocumentPodcastStatus.WAIT_TO
):
    now = datetime.now(timezone.utc)
    task = models.task.DocumentPodcastTask(user_id=user_id,
                                           status=status,
                                           document_id=document_id,
                                           create_time=now)
    db.add(task)
    db.flush()
    return task

def create_document_graph_task(
    db: Session,
    user_id: int,
    document_id: int,
    status: DocumentGraphStatus = DocumentGraphStatus.WAIT_TO
):
    now = datetime.now(timezone.utc)
    task = models.task.DocumentGraphTask(user_id=user_id,
                                         status=status,
                                         document_id=document_id,
                                         create_time=now)
    db.add(task)
    db.flush()
    return task

def create_document_process_task(
    db: Session,
    user_id: int,
    document_id: int,
    status: DocumentProcessStatus = DocumentProcessStatus.WAIT_TO
):
    now = datetime.now(timezone.utc)
    task = models.task.DocumentProcessTask(user_id=user_id,
                                           status=status,
                                           document_id=document_id,
                                           create_time=now)
    db.add(task)
    db.flush()
    return task

def create_document_embedding_task(
    db: Session,
    user_id: int,
    document_id: int,
    status: DocumentEmbeddingStatus = DocumentEmbeddingStatus.WAIT_TO
):
    now = datetime.now(timezone.utc)
    task = models.task.DocumentEmbeddingTask(user_id=user_id,
                                             status=status,
                                             document_id=document_id,
                                             create_time=now)
    db.add(task)
    db.flush()
    return task

def create_document_convert_task(
    db: Session,
    user_id: int,
    document_id: int,
    status: DocumentMdConvertStatus = DocumentMdConvertStatus.WAIT_TO
):
    now = datetime.now(timezone.utc)
    task = models.task.DocumentConvertToMdTask(
        user_id=user_id,
        status=status,
        document_id=document_id,
        create_time=now
    )
    db.add(task)
    db.flush()
    return task

def get_section_process_tasks(
    db: Session,
):
    query = db.query(models.section.Section, models.task.SectionProcessTask)
    query = query.join(
        models.task.SectionProcessTask,
        models.task.SectionProcessTask.section_id == models.section.Section.id
    )
    query = query.join(
        models.task.SectionTriggerScheduler,
        models.task.SectionTriggerScheduler.section_process_task_id == models.task.SectionProcessTask.id
    )
    query = query.filter(
        models.section.Section.delete_at.is_(None),
        models.task.SectionProcessTask.delete_at.is_(None),
        models.task.SectionProcessTask.trigger_type == SectionProcessTriggerType.SCHEDULER,
    )
    return query.all()

def get_section_process_trigger_scheduler_by_section_id(
    db: Session,
    section_id: int
):
    query = db.query(models.task.SectionTriggerScheduler)
    query = query.join(models.task.SectionProcessTask)
    query = query.filter(models.task.SectionProcessTask.section_id == section_id,
                         models.task.SectionTriggerScheduler.delete_at == None)
    return query.one_or_none()

def get_section_process_task_by_section_id(
    db: Session,
    section_id: int
):
    query = db.query(models.task.SectionProcessTask)
    query = query.filter(models.task.SectionProcessTask.section_id == section_id,
                         models.task.SectionProcessTask.delete_at == None)
    return query.one_or_none()

def get_document_graph_task_by_document_id(
    db: Session,
    document_id: int
):
    query = db.query(models.task.DocumentGraphTask)
    query = query.filter(models.task.DocumentGraphTask.document_id == document_id,
                         models.task.DocumentGraphTask.delete_at == None)
    return query.one_or_none()

def get_document_process_task_by_document_id(
    db: Session,
    document_id: int
):
    query = db.query(models.task.DocumentProcessTask)
    query = query.filter(models.task.DocumentProcessTask.document_id == document_id,
                         models.task.DocumentProcessTask.delete_at == None)
    return query.one_or_none()

def get_section_podcast_task_by_section_id(
    db: Session,
    section_id: int
):
    query = db.query(models.task.SectionPodcastTask)
    query = query.filter(models.task.SectionPodcastTask.section_id == section_id,
                         models.task.SectionPodcastTask.delete_at == None)
    return query.one_or_none()

def get_document_podcast_task_by_document_id(
    db: Session,
    document_id: int
):
    query = db.query(models.task.DocumentPodcastTask)
    query = query.filter(models.task.DocumentPodcastTask.document_id == document_id,
                         models.task.DocumentPodcastTask.delete_at == None)
    return query.one_or_none()

def get_document_embedding_task_by_document_id(
    db: Session,
    document_id: int
):
    query = db.query(models.task.DocumentEmbeddingTask)
    query = query.filter(models.task.DocumentEmbeddingTask.document_id == document_id,
                         models.task.DocumentEmbeddingTask.delete_at == None)
    return query.one_or_none()

def get_document_convert_task_by_document_id(
    db: Session,
    document_id: int
):
    query = db.query(models.task.DocumentConvertToMdTask)
    query = query.filter(models.task.DocumentConvertToMdTask.document_id == document_id,
                         models.task.DocumentConvertToMdTask.delete_at == None)
    return query.one_or_none()

def get_document_convert_tasks_by_document_ids(
    db: Session,
    document_ids: list[int]
):
    if not document_ids:
        return []
    query = db.query(models.task.DocumentConvertToMdTask)
    query = query.filter(
        models.task.DocumentConvertToMdTask.document_id.in_(document_ids),
        models.task.DocumentConvertToMdTask.delete_at == None,
    )
    return query.all()

def get_document_embedding_tasks_by_document_ids(
    db: Session,
    document_ids: list[int]
):
    if not document_ids:
        return []
    query = db.query(models.task.DocumentEmbeddingTask)
    query = query.filter(
        models.task.DocumentEmbeddingTask.document_id.in_(document_ids),
        models.task.DocumentEmbeddingTask.delete_at == None,
    )
    return query.all()

def get_document_graph_tasks_by_document_ids(
    db: Session,
    document_ids: list[int]
):
    if not document_ids:
        return []
    query = db.query(models.task.DocumentGraphTask)
    query = query.filter(
        models.task.DocumentGraphTask.document_id.in_(document_ids),
        models.task.DocumentGraphTask.delete_at == None,
    )
    return query.all()

def get_document_podcast_tasks_by_document_ids(
    db: Session,
    document_ids: list[int]
):
    if not document_ids:
        return []
    query = db.query(models.task.DocumentPodcastTask)
    query = query.filter(
        models.task.DocumentPodcastTask.document_id.in_(document_ids),
        models.task.DocumentPodcastTask.delete_at == None,
    )
    return query.all()

def get_document_process_tasks_by_document_ids(
    db: Session,
    document_ids: list[int]
):
    if not document_ids:
        return []
    query = db.query(models.task.DocumentProcessTask)
    query = query.filter(
        models.task.DocumentProcessTask.document_id.in_(document_ids),
        models.task.DocumentProcessTask.delete_at == None,
    )
    return query.all()

def delete_document_convert_task_by_document_ids(
    db: Session,
    user_id: int,
    document_ids: list[int]
):
    now = datetime.now(timezone.utc)
    query = db.query(models.task.DocumentConvertToMdTask)
    query = query.filter(
        models.task.DocumentConvertToMdTask.document_id.in_(document_ids),
        models.task.DocumentConvertToMdTask.delete_at == None,
        models.task.DocumentConvertToMdTask.user_id == user_id
    )
    query = query.update({models.task.DocumentConvertToMdTask.delete_at: now}, synchronize_session=False)
    db.flush()
