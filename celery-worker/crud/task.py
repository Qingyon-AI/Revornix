import models
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from enums.document import DocumentGraphStatus, DocumentPodcastStatus
from enums.section import SectionPodcastStatus, SectionProcessStatus

def create_section_process_task(
    db: Session,
    user_id: int,
    section_id: int,
    status: SectionProcessStatus = SectionProcessStatus.WAIT_TO
):
    now = datetime.now(timezone.utc)
    task = models.task.SectionProcessTask(user_id=user_id,
                                          status=status,
                                          section_id=section_id,
                                          create_time=now)
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
    status: DocumentGraphStatus = DocumentGraphStatus.WAIT_TO
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
    status: DocumentGraphStatus = DocumentGraphStatus.WAIT_TO
):
    now = datetime.now(timezone.utc)
    task = models.task.DocumentEmbeddingTask(user_id=user_id,
                                             status=status,
                                             document_id=document_id,
                                             create_time=now)
    db.add(task)
    db.flush()
    return task

def get_section_process_task_by_section_id(
    db: Session,
    section_id: int
):
    query = db.query(models.task.SectionProcessTask)
    query = query.filter(models.task.SectionProcessTask.section_id == section_id,
                         models.task.SectionProcessTask.delete_at == None)
    return query.one_or_none()

def get_document_process_task_by_document_id(
    db: Session,
    document_id: int
):
    query = db.query(models.task.DocumentProcessTask)
    query = query.filter(models.task.DocumentProcessTask.document_id == document_id,
                         models.task.DocumentProcessTask.delete_at == None)
    return query.one_or_none()

def get_document_transform_task_by_document_id(
    db: Session,
    document_id: int
):
    query = db.query(models.task.DocumentTransformToMdTask)
    query = query.filter(models.task.DocumentTransformToMdTask.document_id == document_id,
                         models.task.DocumentTransformToMdTask.delete_at == None)
    return query.one_or_none()