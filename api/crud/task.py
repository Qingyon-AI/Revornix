from datetime import datetime, timezone

from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Session

import models
from enums.document import (
    DocumentEmbeddingStatus,
    DocumentGraphStatus,
    DocumentMdConvertStatus,
    DocumentPodcastStatus,
    DocumentProcessStatus,
    DocumentSummarizeStatus,
    DocumentAudioTranscribeStatus
)
from enums.section import (
    SectionPodcastStatus,
    SectionProcessStatus,
    SectionProcessTriggerType,
)


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

async def create_section_process_task_trigger_scheduler_async(
    db: AsyncSession,
    section_process_task_id: int,
    cron_expr: str
):
    scheduler = models.task.SectionTriggerScheduler(
        section_process_task_id=section_process_task_id,
        cron_expr=cron_expr
    )
    db.add(scheduler)
    await db.flush()
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

async def create_section_process_task_async(
    db: AsyncSession,
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
    await db.flush()
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

async def create_section_podcast_task_async(
    db: AsyncSession,
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
    await db.flush()
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

async def create_document_summarize_task_async(
    db: AsyncSession,
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
    await db.flush()
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

async def create_document_podcast_task_async(
    db: AsyncSession,
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
    await db.flush()
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

async def create_document_graph_task_async(
    db: AsyncSession,
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
    await db.flush()
    return task

def create_document_audio_transcribe_task(
    db: Session,
    user_id: int,
    document_id: int,
    status: DocumentAudioTranscribeStatus = DocumentAudioTranscribeStatus.WAIT_TO
):
    now = datetime.now(timezone.utc)
    task = models.task.DocumentAudioTranscribeTask(
        user_id=user_id,
        status=status,
        document_id=document_id,
        create_time=now
    )
    db.add(task)
    db.flush()
    return task

async def create_document_audio_transcribe_task_async(
    db: AsyncSession,
    user_id: int,
    document_id: int,
    status: DocumentAudioTranscribeStatus = DocumentAudioTranscribeStatus.WAIT_TO
):
    now = datetime.now(timezone.utc)
    task = models.task.DocumentAudioTranscribeTask(
        user_id=user_id,
        status=status,
        document_id=document_id,
        create_time=now
    )
    db.add(task)
    await db.flush()
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

async def create_document_process_task_async(
    db: AsyncSession,
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
    await db.flush()
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

async def create_document_embedding_task_async(
    db: AsyncSession,
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
    await db.flush()
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

async def create_document_convert_task_async(
    db: AsyncSession,
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
    await db.flush()
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

async def get_section_process_tasks_async(
    db: AsyncSession,
):
    result = await db.execute(
        select(models.section.Section, models.task.SectionProcessTask)
        .join(
            models.task.SectionProcessTask,
            models.task.SectionProcessTask.section_id == models.section.Section.id
        )
        .join(
            models.task.SectionTriggerScheduler,
            models.task.SectionTriggerScheduler.section_process_task_id == models.task.SectionProcessTask.id
        )
        .where(
            models.section.Section.delete_at.is_(None),
            models.task.SectionProcessTask.delete_at.is_(None),
            models.task.SectionProcessTask.trigger_type == SectionProcessTriggerType.SCHEDULER,
        )
    )
    return result.all()

def get_section_process_trigger_scheduler_by_section_id(
    db: Session,
    section_id: int
):
    query = db.query(models.task.SectionTriggerScheduler)
    query = query.join(models.task.SectionProcessTask)
    query = query.filter(models.task.SectionProcessTask.section_id == section_id,
                         models.task.SectionTriggerScheduler.delete_at.is_(None))
    return query.one_or_none()

async def get_section_process_trigger_scheduler_by_section_id_async(
    db: AsyncSession,
    section_id: int
):
    stmt = (
        select(models.task.SectionTriggerScheduler)
        .join(models.task.SectionProcessTask)
        .where(
            models.task.SectionProcessTask.section_id == section_id,
            models.task.SectionTriggerScheduler.delete_at.is_(None),
        )
    )
    return (await db.execute(stmt)).scalar_one_or_none()

def get_section_process_task_by_section_id(
    db: Session,
    section_id: int
):
    query = db.query(models.task.SectionProcessTask)
    query = query.filter(models.task.SectionProcessTask.section_id == section_id,
                         models.task.SectionProcessTask.delete_at.is_(None))
    return query.one_or_none()

async def get_section_process_task_by_section_id_async(
    db: AsyncSession,
    section_id: int
):
    stmt = select(models.task.SectionProcessTask).where(
        models.task.SectionProcessTask.section_id == section_id,
        models.task.SectionProcessTask.delete_at.is_(None),
    )
    return (await db.execute(stmt)).scalar_one_or_none()

async def get_document_summarize_task_by_document_id_async(
    db: AsyncSession,
    document_id: int,
):
    stmt = select(models.task.DocumentSummarizeTask).where(
        models.task.DocumentSummarizeTask.document_id == document_id,
        models.task.DocumentSummarizeTask.delete_at.is_(None),
    )
    return (await db.execute(stmt)).scalar_one_or_none()

async def get_document_graph_task_by_document_id_async(
    db: AsyncSession,
    document_id: int,
):
    stmt = select(models.task.DocumentGraphTask).where(
        models.task.DocumentGraphTask.document_id == document_id,
        models.task.DocumentGraphTask.delete_at.is_(None),
    )
    return (await db.execute(stmt)).scalar_one_or_none()

async def get_document_process_task_by_document_id_async(
    db: AsyncSession,
    document_id: int,
):
    stmt = select(models.task.DocumentProcessTask).where(
        models.task.DocumentProcessTask.document_id == document_id,
        models.task.DocumentProcessTask.delete_at.is_(None),
    )
    return (await db.execute(stmt)).scalar_one_or_none()


async def get_document_task_bundle_by_document_id_async(
    db: AsyncSession,
    document_id: int,
):
    stmt = (
        select(
            models.task.DocumentConvertToMdTask,
            models.task.DocumentPodcastTask,
            models.task.DocumentSummarizeTask,
            models.task.DocumentEmbeddingTask,
            models.task.DocumentGraphTask,
            models.task.DocumentAudioTranscribeTask,
            models.task.DocumentProcessTask,
        )
        .select_from(models.document.Document)
        .outerjoin(
            models.task.DocumentConvertToMdTask,
            and_(
                models.task.DocumentConvertToMdTask.document_id == models.document.Document.id,
                models.task.DocumentConvertToMdTask.delete_at.is_(None),
            ),
        )
        .outerjoin(
            models.task.DocumentPodcastTask,
            and_(
                models.task.DocumentPodcastTask.document_id == models.document.Document.id,
                models.task.DocumentPodcastTask.delete_at.is_(None),
            ),
        )
        .outerjoin(
            models.task.DocumentSummarizeTask,
            and_(
                models.task.DocumentSummarizeTask.document_id == models.document.Document.id,
                models.task.DocumentSummarizeTask.delete_at.is_(None),
            ),
        )
        .outerjoin(
            models.task.DocumentEmbeddingTask,
            and_(
                models.task.DocumentEmbeddingTask.document_id == models.document.Document.id,
                models.task.DocumentEmbeddingTask.delete_at.is_(None),
            ),
        )
        .outerjoin(
            models.task.DocumentGraphTask,
            and_(
                models.task.DocumentGraphTask.document_id == models.document.Document.id,
                models.task.DocumentGraphTask.delete_at.is_(None),
            ),
        )
        .outerjoin(
            models.task.DocumentAudioTranscribeTask,
            and_(
                models.task.DocumentAudioTranscribeTask.document_id == models.document.Document.id,
                models.task.DocumentAudioTranscribeTask.delete_at.is_(None),
            ),
        )
        .outerjoin(
            models.task.DocumentProcessTask,
            and_(
                models.task.DocumentProcessTask.document_id == models.document.Document.id,
                models.task.DocumentProcessTask.delete_at.is_(None),
            ),
        )
        .where(
            models.document.Document.id == document_id,
            models.document.Document.delete_at.is_(None),
        )
    )
    return (await db.execute(stmt)).one_or_none()


async def get_document_task_bundles_by_document_ids_async(
    db: AsyncSession,
    document_ids: list[int],
):
    if not document_ids:
        return []
    stmt = (
        select(
            models.document.Document.id,
            models.task.DocumentConvertToMdTask,
            models.task.DocumentPodcastTask,
            models.task.DocumentSummarizeTask,
            models.task.DocumentEmbeddingTask,
            models.task.DocumentGraphTask,
            models.task.DocumentAudioTranscribeTask,
            models.task.DocumentProcessTask,
        )
        .select_from(models.document.Document)
        .outerjoin(
            models.task.DocumentConvertToMdTask,
            and_(
                models.task.DocumentConvertToMdTask.document_id == models.document.Document.id,
                models.task.DocumentConvertToMdTask.delete_at.is_(None),
            ),
        )
        .outerjoin(
            models.task.DocumentPodcastTask,
            and_(
                models.task.DocumentPodcastTask.document_id == models.document.Document.id,
                models.task.DocumentPodcastTask.delete_at.is_(None),
            ),
        )
        .outerjoin(
            models.task.DocumentSummarizeTask,
            and_(
                models.task.DocumentSummarizeTask.document_id == models.document.Document.id,
                models.task.DocumentSummarizeTask.delete_at.is_(None),
            ),
        )
        .outerjoin(
            models.task.DocumentEmbeddingTask,
            and_(
                models.task.DocumentEmbeddingTask.document_id == models.document.Document.id,
                models.task.DocumentEmbeddingTask.delete_at.is_(None),
            ),
        )
        .outerjoin(
            models.task.DocumentGraphTask,
            and_(
                models.task.DocumentGraphTask.document_id == models.document.Document.id,
                models.task.DocumentGraphTask.delete_at.is_(None),
            ),
        )
        .outerjoin(
            models.task.DocumentAudioTranscribeTask,
            and_(
                models.task.DocumentAudioTranscribeTask.document_id == models.document.Document.id,
                models.task.DocumentAudioTranscribeTask.delete_at.is_(None),
            ),
        )
        .outerjoin(
            models.task.DocumentProcessTask,
            and_(
                models.task.DocumentProcessTask.document_id == models.document.Document.id,
                models.task.DocumentProcessTask.delete_at.is_(None),
            ),
        )
        .where(
            models.document.Document.id.in_(document_ids),
            models.document.Document.delete_at.is_(None),
        )
    )
    return list((await db.execute(stmt)).all())

def get_section_podcast_task_by_section_id(
    db: Session,
    section_id: int
):
    query = db.query(models.task.SectionPodcastTask)
    query = query.filter(models.task.SectionPodcastTask.section_id == section_id,
                         models.task.SectionPodcastTask.delete_at.is_(None))
    return query.one_or_none()

async def get_section_podcast_task_by_section_id_async(
    db: AsyncSession,
    section_id: int
):
    stmt = select(models.task.SectionPodcastTask).where(
        models.task.SectionPodcastTask.section_id == section_id,
        models.task.SectionPodcastTask.delete_at.is_(None),
    )
    return (await db.execute(stmt)).scalar_one_or_none()

async def get_section_podcast_tasks_by_section_ids_async(
    db: AsyncSession,
    section_ids: list[int],
):
    if not section_ids:
        return []
    stmt = select(models.task.SectionPodcastTask).where(
        models.task.SectionPodcastTask.section_id.in_(section_ids),
        models.task.SectionPodcastTask.delete_at.is_(None),
    )
    return list((await db.execute(stmt)).scalars().all())

async def get_document_podcast_task_by_document_id_async(
    db: AsyncSession,
    document_id: int,
):
    stmt = select(models.task.DocumentPodcastTask).where(
        models.task.DocumentPodcastTask.document_id == document_id,
        models.task.DocumentPodcastTask.delete_at.is_(None),
    )
    return (await db.execute(stmt)).scalar_one_or_none()

async def get_document_embedding_task_by_document_id_async(
    db: AsyncSession,
    document_id: int,
):
    stmt = select(models.task.DocumentEmbeddingTask).where(
        models.task.DocumentEmbeddingTask.document_id == document_id,
        models.task.DocumentEmbeddingTask.delete_at.is_(None),
    )
    return (await db.execute(stmt)).scalar_one_or_none()

def get_document_convert_task_by_document_id(
    db: Session,
    document_id: int
):
    query = db.query(models.task.DocumentConvertToMdTask)
    query = query.filter(models.task.DocumentConvertToMdTask.document_id == document_id,
                         models.task.DocumentConvertToMdTask.delete_at.is_(None))
    return query.one_or_none()

async def get_document_convert_task_by_document_id_async(
    db: AsyncSession,
    document_id: int,
):
    stmt = select(models.task.DocumentConvertToMdTask).where(
        models.task.DocumentConvertToMdTask.document_id == document_id,
        models.task.DocumentConvertToMdTask.delete_at.is_(None),
    )
    return (await db.execute(stmt)).scalar_one_or_none()

def get_document_audio_transcribe_task_by_document_id(
    db: Session,
    document_id: int
):
    query = db.query(models.task.DocumentAudioTranscribeTask)
    query = query.filter(models.task.DocumentAudioTranscribeTask.document_id == document_id,
                         models.task.DocumentAudioTranscribeTask.delete_at.is_(None))
    return query.one_or_none()

async def get_document_audio_transcribe_task_by_document_id_async(
    db: AsyncSession,
    document_id: int,
):
    stmt = select(models.task.DocumentAudioTranscribeTask).where(
        models.task.DocumentAudioTranscribeTask.document_id == document_id,
        models.task.DocumentAudioTranscribeTask.delete_at.is_(None),
    )
    return (await db.execute(stmt)).scalar_one_or_none()

def get_document_convert_tasks_by_document_ids(
    db: Session,
    document_ids: list[int]
):
    if not document_ids:
        return []
    query = db.query(models.task.DocumentConvertToMdTask)
    query = query.filter(
        models.task.DocumentConvertToMdTask.document_id.in_(document_ids),
        models.task.DocumentConvertToMdTask.delete_at.is_(None),
    )
    return query.all()

async def get_document_convert_tasks_by_document_ids_async(
    db: AsyncSession,
    document_ids: list[int],
):
    if not document_ids:
        return []
    stmt = select(models.task.DocumentConvertToMdTask).where(
        models.task.DocumentConvertToMdTask.document_id.in_(document_ids),
        models.task.DocumentConvertToMdTask.delete_at.is_(None),
    )
    return list((await db.execute(stmt)).scalars().all())

def get_document_embedding_tasks_by_document_ids(
    db: Session,
    document_ids: list[int]
):
    if not document_ids:
        return []
    query = db.query(models.task.DocumentEmbeddingTask)
    query = query.filter(
        models.task.DocumentEmbeddingTask.document_id.in_(document_ids),
        models.task.DocumentEmbeddingTask.delete_at.is_(None),
    )
    return query.all()


async def get_document_embedding_tasks_by_document_ids_async(
    db: AsyncSession,
    document_ids: list[int],
):
    if not document_ids:
        return []
    stmt = select(models.task.DocumentEmbeddingTask).where(
        models.task.DocumentEmbeddingTask.document_id.in_(document_ids),
        models.task.DocumentEmbeddingTask.delete_at.is_(None),
    )
    return list((await db.execute(stmt)).scalars().all())

def get_document_graph_tasks_by_document_ids(
    db: Session,
    document_ids: list[int]
):
    if not document_ids:
        return []
    query = db.query(models.task.DocumentGraphTask)
    query = query.filter(
        models.task.DocumentGraphTask.document_id.in_(document_ids),
        models.task.DocumentGraphTask.delete_at.is_(None),
    )
    return query.all()

async def get_document_graph_tasks_by_document_ids_async(
    db: AsyncSession,
    document_ids: list[int],
):
    if not document_ids:
        return []
    stmt = select(models.task.DocumentGraphTask).where(
        models.task.DocumentGraphTask.document_id.in_(document_ids),
        models.task.DocumentGraphTask.delete_at.is_(None),
    )
    return list((await db.execute(stmt)).scalars().all())

def get_document_summarize_tasks_by_document_ids(
    db: Session,
    document_ids: list[int]
):
    if not document_ids:
        return []
    query = db.query(models.task.DocumentSummarizeTask)
    query = query.filter(
        models.task.DocumentSummarizeTask.document_id.in_(document_ids),
        models.task.DocumentSummarizeTask.delete_at.is_(None),
    )
    return query.all()


async def get_document_summarize_tasks_by_document_ids_async(
    db: AsyncSession,
    document_ids: list[int],
):
    if not document_ids:
        return []
    stmt = select(models.task.DocumentSummarizeTask).where(
        models.task.DocumentSummarizeTask.document_id.in_(document_ids),
        models.task.DocumentSummarizeTask.delete_at.is_(None),
    )
    return list((await db.execute(stmt)).scalars().all())

def get_document_podcast_tasks_by_document_ids(
    db: Session,
    document_ids: list[int]
):
    if not document_ids:
        return []
    query = db.query(models.task.DocumentPodcastTask)
    query = query.filter(
        models.task.DocumentPodcastTask.document_id.in_(document_ids),
        models.task.DocumentPodcastTask.delete_at.is_(None),
    )
    return query.all()

async def get_document_podcast_tasks_by_document_ids_async(
    db: AsyncSession,
    document_ids: list[int],
):
    if not document_ids:
        return []
    stmt = select(models.task.DocumentPodcastTask).where(
        models.task.DocumentPodcastTask.document_id.in_(document_ids),
        models.task.DocumentPodcastTask.delete_at.is_(None),
    )
    return list((await db.execute(stmt)).scalars().all())

def get_document_transcribe_tasks_by_document_ids(
    db: Session,
    document_ids: list[int]
):
    if not document_ids:
        return []
    query = db.query(models.task.DocumentAudioTranscribeTask)
    query = query.filter(
        models.task.DocumentAudioTranscribeTask.document_id.in_(document_ids),
        models.task.DocumentAudioTranscribeTask.delete_at.is_(None),
    )
    return query.all()

async def get_document_transcribe_tasks_by_document_ids_async(
    db: AsyncSession,
    document_ids: list[int],
):
    if not document_ids:
        return []
    stmt = select(models.task.DocumentAudioTranscribeTask).where(
        models.task.DocumentAudioTranscribeTask.document_id.in_(document_ids),
        models.task.DocumentAudioTranscribeTask.delete_at.is_(None),
    )
    return list((await db.execute(stmt)).scalars().all())

def get_document_process_tasks_by_document_ids(
    db: Session,
    document_ids: list[int]
):
    if not document_ids:
        return []
    query = db.query(models.task.DocumentProcessTask)
    query = query.filter(
        models.task.DocumentProcessTask.document_id.in_(document_ids),
        models.task.DocumentProcessTask.delete_at.is_(None),
    )
    return query.all()

async def get_document_process_tasks_by_document_ids_async(
    db: AsyncSession,
    document_ids: list[int],
):
    if not document_ids:
        return []
    stmt = select(models.task.DocumentProcessTask).where(
        models.task.DocumentProcessTask.document_id.in_(document_ids),
        models.task.DocumentProcessTask.delete_at.is_(None),
    )
    return list((await db.execute(stmt)).scalars().all())

def delete_document_convert_task_by_document_ids(
    db: Session,
    user_id: int,
    document_ids: list[int]
):
    now = datetime.now(timezone.utc)
    query = db.query(models.task.DocumentConvertToMdTask)
    query = query.filter(
        models.task.DocumentConvertToMdTask.document_id.in_(document_ids),
        models.task.DocumentConvertToMdTask.delete_at.is_(None),
        models.task.DocumentConvertToMdTask.user_id == user_id
    )
    query = query.update({models.task.DocumentConvertToMdTask.delete_at: now}, synchronize_session=False)
    db.flush()

async def cancel_document_summarize_task_async(
    db: AsyncSession,
    document_id: int,
) -> models.task.DocumentSummarizeTask | None:
    now = datetime.now(timezone.utc)
    task = await get_document_summarize_task_by_document_id_async(db=db, document_id=document_id)
    if task is None:
        return None
    if task.status not in (
        DocumentSummarizeStatus.WAIT_TO,
        DocumentSummarizeStatus.SUMMARIZING,
    ):
        return None
    task.status = DocumentSummarizeStatus.CANCELLED
    task.update_time = now
    return task


async def cancel_document_graph_task_async(
    db: AsyncSession,
    document_id: int,
) -> models.task.DocumentGraphTask | None:
    now = datetime.now(timezone.utc)
    task = await get_document_graph_task_by_document_id_async(db=db, document_id=document_id)
    if task is None:
        return None
    if task.status not in (
        DocumentGraphStatus.WAIT_TO,
        DocumentGraphStatus.BUILDING,
    ):
        return None
    task.status = DocumentGraphStatus.CANCELLED
    task.update_time = now
    return task


async def cancel_document_podcast_task_async(
    db: AsyncSession,
    document_id: int,
) -> models.task.DocumentPodcastTask | None:
    now = datetime.now(timezone.utc)
    task = await get_document_podcast_task_by_document_id_async(db=db, document_id=document_id)
    if task is None:
        return None
    if task.status not in (
        DocumentPodcastStatus.WAIT_TO,
        DocumentPodcastStatus.GENERATING,
    ):
        return None
    task.status = DocumentPodcastStatus.CANCELLED
    task.update_time = now
    return task


async def cancel_document_embedding_task_async(
    db: AsyncSession,
    document_id: int,
) -> models.task.DocumentEmbeddingTask | None:
    now = datetime.now(timezone.utc)
    task = await get_document_embedding_task_by_document_id_async(db=db, document_id=document_id)
    if task is None:
        return None
    if task.status not in (
        DocumentEmbeddingStatus.WAIT_TO,
        DocumentEmbeddingStatus.EMBEDDING,
    ):
        return None
    task.status = DocumentEmbeddingStatus.CANCELLED
    task.update_time = now
    return task


def cancel_document_transcribe_task(
    db: Session,
    document_id: int,
) -> models.task.DocumentAudioTranscribeTask | None:
    now = datetime.now(timezone.utc)
    task = get_document_audio_transcribe_task_by_document_id(db=db, document_id=document_id)
    if task is None:
        return None
    if task.status not in (
        DocumentAudioTranscribeStatus.WAIT_TO,
        DocumentAudioTranscribeStatus.TRANSCRIBING,
    ):
        return None
    task.status = DocumentAudioTranscribeStatus.CANCELLED
    task.update_time = now
    return task

async def cancel_document_transcribe_task_async(
    db: AsyncSession,
    document_id: int,
) -> models.task.DocumentAudioTranscribeTask | None:
    now = datetime.now(timezone.utc)
    task = await get_document_audio_transcribe_task_by_document_id_async(db=db, document_id=document_id)
    if task is None:
        return None
    if task.status not in (
        DocumentAudioTranscribeStatus.WAIT_TO,
        DocumentAudioTranscribeStatus.TRANSCRIBING,
    ):
        return None
    task.status = DocumentAudioTranscribeStatus.CANCELLED
    task.update_time = now
    return task


def cancel_section_podcast_task(
    db: Session,
    section_id: int,
) -> models.task.SectionPodcastTask | None:
    now = datetime.now(timezone.utc)
    task = get_section_podcast_task_by_section_id(db=db, section_id=section_id)
    if task is None:
        return None
    if task.status not in (
        SectionPodcastStatus.WAIT_TO,
        SectionPodcastStatus.GENERATING,
    ):
        return None
    task.status = SectionPodcastStatus.CANCELLED
    task.update_time = now
    return task

async def cancel_section_podcast_task_async(
    db: AsyncSession,
    section_id: int,
) -> models.task.SectionPodcastTask | None:
    now = datetime.now(timezone.utc)
    task = await get_section_podcast_task_by_section_id_async(db=db, section_id=section_id)
    if task is None:
        return None
    if task.status not in (
        SectionPodcastStatus.WAIT_TO,
        SectionPodcastStatus.GENERATING,
    ):
        return None
    task.status = SectionPodcastStatus.CANCELLED
    task.update_time = now
    return task


def cancel_section_process_task(
    db: Session,
    section_id: int,
) -> models.task.SectionProcessTask | None:
    now = datetime.now(timezone.utc)
    task = get_section_process_task_by_section_id(db=db, section_id=section_id)
    if task is None:
        return None
    if task.status not in (
        SectionProcessStatus.WAIT_TO,
        SectionProcessStatus.PROCESSING,
    ):
        return None
    task.status = SectionProcessStatus.CANCELLED
    task.update_time = now
    return task

async def cancel_section_process_task_async(
    db: AsyncSession,
    section_id: int,
) -> models.task.SectionProcessTask | None:
    now = datetime.now(timezone.utc)
    task = await get_section_process_task_by_section_id_async(db=db, section_id=section_id)
    if task is None:
        return None
    if task.status not in (
        SectionProcessStatus.WAIT_TO,
        SectionProcessStatus.PROCESSING,
    ):
        return None
    task.status = SectionProcessStatus.CANCELLED
    task.update_time = now
    return task


def cancel_document_tasks_by_document_ids(
    db: Session,
    document_ids: list[int]
):
    if not document_ids:
        return
    now = datetime.now(timezone.utc)

    def _cancel(model, failed_status, active_statuses):
        query = db.query(model)
        query = query.filter(
            model.document_id.in_(document_ids),
            model.delete_at.is_(None),
            model.status.in_(active_statuses),
        )
        query.update(
            {
                model.status: failed_status,
                model.update_time: now,
            },
            synchronize_session=False,
        )

    _cancel(
        models.task.DocumentProcessTask,
        DocumentProcessStatus.FAILED,
        [DocumentProcessStatus.WAIT_TO, DocumentProcessStatus.PROCESSING],
    )
    _cancel(
        models.task.DocumentConvertToMdTask,
        DocumentMdConvertStatus.FAILED,
        [DocumentMdConvertStatus.WAIT_TO, DocumentMdConvertStatus.CONVERTING],
    )
    _cancel(
        models.task.DocumentEmbeddingTask,
        DocumentEmbeddingStatus.FAILED,
        [DocumentEmbeddingStatus.WAIT_TO, DocumentEmbeddingStatus.EMBEDDING],
    )
    _cancel(
        models.task.DocumentGraphTask,
        DocumentGraphStatus.FAILED,
        [DocumentGraphStatus.WAIT_TO, DocumentGraphStatus.BUILDING],
    )
    _cancel(
        models.task.DocumentSummarizeTask,
        DocumentSummarizeStatus.FAILED,
        [DocumentSummarizeStatus.WAIT_TO, DocumentSummarizeStatus.SUMMARIZING],
    )
    _cancel(
        models.task.DocumentPodcastTask,
        DocumentPodcastStatus.FAILED,
        [DocumentPodcastStatus.WAIT_TO, DocumentPodcastStatus.GENERATING],
    )
    _cancel(
        models.task.DocumentAudioTranscribeTask,
        DocumentAudioTranscribeStatus.FAILED,
        [DocumentAudioTranscribeStatus.WAIT_TO, DocumentAudioTranscribeStatus.TRANSCRIBING],
    )

async def cancel_document_tasks_by_document_ids_async(
    db: AsyncSession,
    document_ids: list[int]
):
    if not document_ids:
        return
    now = datetime.now(timezone.utc)

    async def _cancel(model, failed_status, active_statuses):
        stmt = select(model).where(
            model.document_id.in_(document_ids),
            model.delete_at.is_(None),
            model.status.in_(active_statuses),
        )
        rows = list((await db.execute(stmt)).scalars().all())
        for row in rows:
            row.status = failed_status
            row.update_time = now

    await _cancel(
        models.task.DocumentProcessTask,
        DocumentProcessStatus.FAILED,
        [DocumentProcessStatus.WAIT_TO, DocumentProcessStatus.PROCESSING],
    )
    await _cancel(
        models.task.DocumentConvertToMdTask,
        DocumentMdConvertStatus.FAILED,
        [DocumentMdConvertStatus.WAIT_TO, DocumentMdConvertStatus.CONVERTING],
    )
    await _cancel(
        models.task.DocumentEmbeddingTask,
        DocumentEmbeddingStatus.FAILED,
        [DocumentEmbeddingStatus.WAIT_TO, DocumentEmbeddingStatus.EMBEDDING],
    )
    await _cancel(
        models.task.DocumentGraphTask,
        DocumentGraphStatus.FAILED,
        [DocumentGraphStatus.WAIT_TO, DocumentGraphStatus.BUILDING],
    )
    await _cancel(
        models.task.DocumentSummarizeTask,
        DocumentSummarizeStatus.FAILED,
        [DocumentSummarizeStatus.WAIT_TO, DocumentSummarizeStatus.SUMMARIZING],
    )
    await _cancel(
        models.task.DocumentPodcastTask,
        DocumentPodcastStatus.FAILED,
        [DocumentPodcastStatus.WAIT_TO, DocumentPodcastStatus.GENERATING],
    )
    await _cancel(
        models.task.DocumentAudioTranscribeTask,
        DocumentAudioTranscribeStatus.FAILED,
        [DocumentAudioTranscribeStatus.WAIT_TO, DocumentAudioTranscribeStatus.TRANSCRIBING],
    )
    await db.flush()
