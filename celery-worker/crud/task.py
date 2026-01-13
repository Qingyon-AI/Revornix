import models
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from enums.document import DocumentGraphStatus, DocumentPodcastStatus, DocumentProcessStatus, DocumentEmbeddingStatus, DocumentMdConvertStatus, DocumentSummarizeStatus
from enums.section import SectionPodcastStatus, SectionProcessStatus, SectionProcessTriggerType

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

def create_document_summarize_task(
    db: Session,
    user_id: int,
    document_id: int,
    status: DocumentSummarizeStatus = DocumentSummarizeStatus.WAIT_TO
):
    now = datetime.now(timezone.utc)
    task = models.task.DocumentSummarizeTask(user_id=user_id,
                                             status=status,
                                             document_id=document_id,
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

def get_section_process_task_by_section_id(
    db: Session,
    section_id: int
):
    query = db.query(models.task.SectionProcessTask)
    query = query.filter(models.task.SectionProcessTask.section_id == section_id,
                         models.task.SectionProcessTask.delete_at == None)
    return query.one_or_none()

def get_document_summarize_task_by_document_id(
    db: Session,
    document_id: int
):
    query = db.query(models.task.DocumentSummarizeTask)
    query = query.filter(models.task.DocumentSummarizeTask.document_id == document_id,
                         models.task.DocumentSummarizeTask.delete_at == None)
    return query.one_or_none()

def get_document_process_task_by_document_id(
    db: Session,
    document_id: int
):
    query = db.query(models.task.DocumentProcessTask)
    query = query.filter(models.task.DocumentProcessTask.document_id == document_id,
                         models.task.DocumentProcessTask.delete_at == None)
    return query.one_or_none()

def get_document_convert_task_by_document_id(
    db: Session,
    document_id: int
):
    query = db.query(models.task.DocumentConvertToMdTask)
    query = query.filter(models.task.DocumentConvertToMdTask.document_id == document_id,
                         models.task.DocumentConvertToMdTask.delete_at == None)
    return query.one_or_none()