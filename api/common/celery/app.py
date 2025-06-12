from dotenv import load_dotenv
load_dotenv(override=True)

from celery import Celery
from config.redis import REDIS_PORT, REDIS_URL

celery_app = Celery('worker', 
                    broker=f'redis://{REDIS_URL}:{REDIS_PORT}/0',
                    backend=f'redis://{REDIS_URL}:{REDIS_PORT}/0')

@celery_app.task
def init_website_document_info(document_id: int, user_id: int):
    ...

@celery_app.task
def create_delete_temp_file_task(path: str):
    ...
    
@celery_app.task
def update_file_document_markdown_with_mineru(document_id: int, 
                                              user_id: int):
    ...
    
@celery_app.task
def update_website_document_markdown_with_jina(document_id: int, 
                                               user_id: int):
    ...

@celery_app.task
def update_ai_summary(document_id: int, 
                      user_id: int):
    ...
    
@celery_app.task
def add_embedding(document_id: int, 
                  user_id: int):
    ...
        
@celery_app.task
def update_sections(sections: list[int],
                    document_id: int,
                    user_id: int):
    ...

@celery_app.task
def update_section_use_document(section_id: int,
                                document_id: int,
                                user_id: int):
    ...