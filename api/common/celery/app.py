from celery import Celery
from config.redis import REDIS_PORT, REDIS_URL
from schemas.task import DocumentOverrideProperty, SectionOverrideProperty

celery_app = Celery('worker', broker=f'redis://{REDIS_URL}:{REDIS_PORT}/0', backend=f'redis://{REDIS_URL}:{REDIS_PORT}/0')

@celery_app.task
def start_trigger_user_notification_event(
    user_id: int,
    trigger_event_uuid: str,
    params: dict | None = None
):
    ...

@celery_app.task
def start_process_document(
    document_id: int,
    user_id: int,
    auto_summary: bool = False,
    auto_podcast: bool = False,
    override: DocumentOverrideProperty | None = None
):
    ...

@celery_app.task
def start_process_section(
    section_id: int,
    user_id: int,
    auto_summary: bool = False,
    auto_podcast: bool = False,
    override: SectionOverrideProperty | None = None
):
    ...

@celery_app.task
def start_process_document_podcast(
    document_id: int,
    user_id: int
):
    ...

@celery_app.task
def start_process_section_podcast(
    section_id: int,
    user_id: int
):
    ...

@celery_app.task
def update_document_process_status(
    document_id: int,
    status: int
):
    ...

@celery_app.task
def update_section_process_status(
    section_id: int,
    status: int
):
    ...