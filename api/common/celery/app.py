from celery import Celery
from config.redis import REDIS_PORT, REDIS_URL

celery_app = Celery('worker', 
                    broker=f'redis://{REDIS_URL}:{REDIS_PORT}/0',
                    backend=f'redis://{REDIS_URL}:{REDIS_PORT}/0')

@celery_app.task
def start_process_document(document_id: int,
                           user_id: int,
                           auto_summary: bool = False,
                           auto_podcast: bool = False,
                           override: dict | None = None):
    ...

@celery_app.task
def update_sections(document_id: int,
                    user_id: int):
    ...
    
@celery_app.task
def start_process_podcast(document_id: int,
                          user_id: int):
    ...
    
@celery_app.task
def update_document_process_status(document_id: int,
                                   status: int):
    ...