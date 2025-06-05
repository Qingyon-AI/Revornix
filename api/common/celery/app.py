from dotenv import load_dotenv
load_dotenv(override=True)

import os
import uuid
import crud
import asyncio
from celery import Celery
from config.redis import REDIS_PORT, REDIS_URL
from config.base import BASE_DIR
from common.common import create_upload_token
from common.logger import log_exception, exception_logger
from common.ai import summary_section_with_origin, summary_document, summary_section
from common.jina import transform_website_to_markdown_by_jina
from common.vector import milvus_client, process_document
from common.file import delete_temp_file_with_delay, RemoteFileService
from common.notification import union_send_notification
from common.sql import SessionLocal
from common.website import crawer_website
from common.mineru import transform_bytes

celery_app = Celery('worker', 
                    broker=f'redis://{REDIS_URL}:{REDIS_PORT}/0',
                    backend=f'redis://{REDIS_URL}:{REDIS_PORT}/0')

async def handle_update_file_document_markdown_with_mineru(document_id: int, 
                                                           user_id: int):
    db = SessionLocal()
    try:
        user = crud.user.get_user_by_id(db=db, user_id=user_id)
        access_token = create_upload_token(user=user)
        remote_file_service = RemoteFileService(authorization=access_token)
        db_document = crud.document.get_document_by_document_id(db=db,
                                                                document_id=document_id)
        db_task = crud.task.get_document_transform_task_by_document_id(db=db,
                                                                    document_id=document_id)
        if db_document is None:
            raise Exception("Document not found")
        if db_document.category != 0:
            raise Exception("This task is only for file document")
        db_file_document = crud.document.get_file_document_by_document_id(db=db,
                                                                        document_id=document_id)
        if db_file_document is None:
            raise Exception("File document not found")
        if db_task is None:
                raise Exception("Document transform task not found")
        db_task.status = 1
        db.commit()
        file_content = await remote_file_service.get_object_bytes(file_path=db_file_document.file_name)
        file_item = uuid.uuid4().hex
        md_file_name = f"markdown/{file_item}.md"
        transform_bytes(data=file_content,
                        output_dir=f'{str(BASE_DIR)}/temp/{file_item}')
        for item in os.listdir(f'{str(BASE_DIR)}/temp/{file_item}/images'):
            await remote_file_service.put_object(remote_file_path=f'images/{item}',
                                                 local_path=f'{str(BASE_DIR)}/temp/{file_item}/images/{item}')
        # 替换图片路径
        with open(f'{str(BASE_DIR)}/temp/{file_item}/{file_item}.md', 'r', encoding='utf-8') as f:
            md_content = f.read()  # 先读取内容
            
        # 替换内容
        md_content = md_content.replace(f'{str(BASE_DIR)}/temp/{file_item}/', '')

        # 写入更新后的内容
        with open(f'{str(BASE_DIR)}/temp/{file_item}/{file_item}.md', 'w', encoding='utf-8') as f:
            f.write(md_content)
        # 上传对应文件到文件服务器
        await remote_file_service.put_object(remote_file_path=md_file_name,
                                             local_path=f'{str(BASE_DIR)}/temp/{file_item}/{file_item}.md')
        db_file_document.md_file_name=md_file_name
        db_task.status = 2
        db.commit()
    except Exception as e:
        exception_logger.error(f"Something is error while updating the file document markdown: {e}")
        log_exception()
        db.rollback()
        db_task.status = 3
        db.commit()

async def handle_update_website_document_markdown_with_jina(document_id: int,
                                                            user_id: int):
    db = SessionLocal()
    user = crud.user.get_user_by_id(db=db, user_id=user_id)
    access_token = create_upload_token(user=user)
    remote_file_service = RemoteFileService(authorization=access_token)
    db_document = crud.document.get_document_by_document_id(db=db,
                                                            document_id=document_id)
    try:
        db_task = crud.task.get_document_transform_task_by_document_id(db=db,
                                                                       document_id=document_id)
        if db_task is None:
            raise Exception("Document transform task not found")
            
        db_task.status = 1
        db.commit()
        db_website_document = crud.document.get_website_document_by_document_id(db=db, 
                                                                                document_id=document_id)
        jina_back_data = transform_website_to_markdown_by_jina(url=db_website_document.url)
        markdown_content = jina_back_data.get('data').get('content')
        md_file_name = f"markdown/{uuid.uuid4().hex}.md"
        await remote_file_service.put_object_with_raw_data(remote_file_path=md_file_name, raw_data=markdown_content)
        crud.document.update_website_document_by_website_document_id(db=db,
                                                                     website_document_id=db_website_document.id,
                                                                     md_file_name=md_file_name)
        db_task.status = 2
        db.commit()
        return markdown_content
    except Exception as e:
        exception_logger.error(f"Something is error while updating the website document markdown: {e}")
        log_exception()
        db.rollback()
        db_task.status = 3
        db.commit()
        
async def handle_add_embedding(document_id: int, user_id: int):
    db = SessionLocal()
    user = crud.user.get_user_by_id(db=db, user_id=user_id)
    access_token = create_upload_token(user=user)
    db_document = crud.document.get_document_by_document_id(db=db,
                                                            document_id=document_id)
    try:
        markdown_content = await get_markdown_content_by_document_id(document_id=document_id,
                                                                     user_id=user_id)
        data = process_document(document_id=document_id, 
                                document_category=db_document.category, 
                                document_content=markdown_content)
        milvus_client.insert(collection_name="document", 
                             data=data)
    except Exception as e:
        exception_logger.error(f"Something is error while embedding the document and write into the milvus cloud: {e}")
        log_exception()

async def handle_update_sections(sections: list[int], 
                                 document_id: int, 
                                 user_id: int):
    db = SessionLocal()
    db_user = crud.user.get_user_by_id(db=db, user_id=user_id)
    if db_user is None:
        raise Exception("User does not exist")
    access_token = create_upload_token(user=db_user)
    remote_file_service = RemoteFileService(authorization=access_token)
    db_document = crud.document.get_document_by_document_id(db=db,
                                                            document_id=document_id)
    if db_document is None:
        raise Exception("Document does not exist")
    markdown_content = await get_markdown_content_by_document_id(document_id=document_id,
                                                                 user_id=user_id)
    try:
        for section_id in sections:
            db_user_section = crud.section.get_section_user_by_section_id_and_user_id(db=db,
                                                                                      section_id=section_id,
                                                                                      user_id=user_id)
            if db_user_section is None:
                raise Exception("User does not have permission to modify this section")
            if db_user_section.authority == 2:
                raise Exception("User does not have permission to modify this section")
            db_section = crud.section.get_section_by_section_id(db=db,
                                                                section_id=section_id)
            try:
                # as the section may have no document binded, we need to check if it has documents
                if db_section.md_file_name is not None:
                        # get the original section summary
                        origin_section_summary = await remote_file_service.get_object_content(file_path=db_section.md_file_name)
                        # generate the new summary using the document
                        new_summary = summary_section_with_origin(user_id=user_id,
                                                                  model_id=db_user.default_document_reader_model_id,
                                                                  origin_section_markdown_content=origin_section_summary,
                                                                  new_document_markdown_content=markdown_content).get('summary')
                        # put the new summary into the file system
                        md_file_name = f"markdown/{uuid.uuid4().hex}.md"
                        await remote_file_service.put_object_with_raw_data(remote_file_path=md_file_name, 
                                                                           raw_data=new_summary)
                        # update the section content
                        crud.section.update_section_by_section_id(db=db,
                                                                  section_id=db_section.id,
                                                                  md_file_name=md_file_name)
                else:
                    # summary the section of the document
                    summary = summary_section(user_id=user_id, 
                                              model_id=db_user.default_document_reader_model_id, 
                                              markdown_content=markdown_content).get('summary')
                    # put the summary into the file system
                    md_file_name = f"markdown/{uuid.uuid4().hex}.md"
                    await remote_file_service.put_object_with_raw_data(remote_file_path=md_file_name, 
                                                                       raw_data=summary)
                    # update the section content
                    crud.section.update_section_by_section_id(db=db,
                                                              section_id=db_section.id,
                                                              md_file_name=md_file_name)
                #  as we successfully update the section, we need to set the status of the section document to 2 
                crud.section.update_section_document_by_section_id_and_document_id(db=db,
                                                                                   document_id=document_id,
                                                                                   section_id=db_section.id,
                                                                                   status=2)
            except Exception as e:
                    log_exception()
                    exception_logger.error(f"Something is error while updating the section: {e}")
                    db.rollback()
                    crud.section.update_section_document_by_section_id_and_document_id(db=db,
                                                                                       document_id=document_id,
                                                                                       section_id=db_section.id,
                                                                                       status=3)
        db.commit()
    except Exception as e:
        exception_logger.error(f"Something is error while getting the section: {e}")
        log_exception()
        db.rollback()
        
async def get_markdown_content_by_document_id(document_id: int, user_id: int):
    db = SessionLocal()
    db_user = crud.user.get_user_by_id(db=db, user_id=user_id)
    if db_user is None:
        raise Exception("User does not exist")
    access_token = create_upload_token(user=db_user)
    remote_file_service = RemoteFileService(authorization=access_token)
    db_document = crud.document.get_document_by_document_id(db=db,
                                                            document_id=document_id)
    if db_document is None:
        raise Exception("Document not found")
    if db_document.category == 1:
        website_document = crud.document.get_website_document_by_document_id(db=db,
                                                                                document_id=document_id)
        if website_document is None:
            raise Exception("Website document not found")
        markdown_content = await remote_file_service.get_object_content(file_path=website_document.md_file_name)
    if db_document.category == 0:
        file_document = crud.document.get_file_document_by_document_id(db=db,
                                                                            document_id=document_id)
        if file_document is None:
            raise Exception("Website document not found")
        markdown_content = await remote_file_service.get_object_content(file_path=file_document.md_file_name)
    if db_document.category == 2:
        quick_note_document = crud.document.get_quick_note_document_by_document_id(db=db,
                                                                                    document_id=document_id)
        markdown_content = quick_note_document.content
    return markdown_content
        
async def handle_update_ai_summary(document_id: int, 
                                   user_id: int):
    db = SessionLocal()
    try:
        db_document = crud.document.get_document_by_document_id(db=db,
                                                                document_id=document_id)
        if db_document is None:
            raise Exception("Document not found")
        markdown_content = await get_markdown_content_by_document_id(document_id=document_id,
                                                                     user_id=user_id)
        model_id = crud.user.get_user_by_id(db=db, user_id=user_id).default_document_reader_model_id
        ai_summary_result = summary_document(user_id=user_id, model_id=model_id, markdown_content=markdown_content)
        crud.document.update_document_by_document_id(db=db,
                                                     document_id=document_id,
                                                     title=ai_summary_result.get('title'),
                                                     description=ai_summary_result.get('description'),
                                                     ai_summary=ai_summary_result.get('summary'))
        db.commit()
    except Exception as e:
        exception_logger.error(f"Something is error while updating the ai summary: {e}")
        log_exception()
        db.rollback()

async def handle_init_website_document_info(document_id: int):
    db = SessionLocal()
    db_document = crud.document.get_document_by_document_id(db=db,
                                                            document_id=document_id)
    if db_document is None:
        raise Exception("Document not found")
    if db_document.category != 1:
        raise Exception("This task is only for website document")
    db_website_document = crud.document.get_website_document_by_document_id(db=db,
                                                                            document_id=document_id)
    if db_website_document is None:
        raise Exception("Website document not found")
    web_info = await crawer_website(url=db_website_document.url)
    db_document.title = web_info.get('title')
    db_document.description = web_info.get('description')
    db_document.cover = web_info.get('cover')
    db.commit()

async def handle_update_section_use_document(section_id: int,
                                             document_id: int,
                                             user_id: int):
    db = SessionLocal()
    user = crud.user.get_user_by_id(db=db, user_id=user_id)
    access_token = create_upload_token(user=user)
    remote_file_service = RemoteFileService(authorization=access_token)
    
    try:
        markdown_content = await get_markdown_content_by_document_id(document_id=document_id,
                                                                     user_id=user_id)
        db_user_section = crud.section.get_section_user_by_section_id_and_user_id(db=db,
                                                                                  section_id=section_id,
                                                                                  user_id=user.id)
        if db_user_section is None:
            raise Exception("User does not have permission to modify this section")
        if db_user_section.authority == 2:
            raise Exception("User does not have permission to modify this section")
        db_section = crud.section.get_section_by_section_id(db=db,
                                                            section_id=section_id)
        # as the section may have no document binded, we need to check if it has documents
        if db_section.md_file_name is not None:
                # get the original section summary
                origin_section_summary = await remote_file_service.get_object_content(file_path=db_section.md_file_name)
                # generate the new summary using the document
                new_summary = summary_section_with_origin(user_id=user_id,
                                                          model_id=user.default_document_reader_model_id,
                                                          origin_section_markdown_content=origin_section_summary,
                                                          new_document_markdown_content=markdown_content).get('summary')
                # put the new summary into the file system
                md_file_name = f"markdown/{uuid.uuid4().hex}.md"
                remote_file_service.put_object_with_raw_data(remote_file_path=md_file_name, 
                                                             raw_data=new_summary)
                # update the section content
                crud.section.update_section_by_section_id(db=db,
                                                          section_id=db_section.id,
                                                          md_file_name=md_file_name)
        else:
            # summary the section of the document
            summary = summary_section(user_id=user_id, 
                                      model_id=user.default_document_reader_model_id, 
                                      markdown_content=markdown_content).get('summary')
            # put the summary into the file system
            md_file_name = f"markdown/{uuid.uuid4().hex}.md"
            remote_file_service.put_object_with_raw_data(remote_file_path=md_file_name, 
                                                         raw_data=summary)
            # update the section content
            crud.section.update_section_by_section_id(db=db, section_id=db_section.id, 
                                                      md_file_name=md_file_name)
        #  as we successfully update the section, we need to set the status of the section document to 2 
        crud.section.update_section_document_by_section_id_and_document_id(db=db,
                                                                           document_id=document_id,
                                                                           section_id=db_section.id,
                                                                           status=2)
    except Exception as e:
            log_exception()
            exception_logger.error(f"Something is error while updating the section: {e}")
            db.rollback()
            crud.section.update_section_document_by_section_id_and_document_id(db=db,
                                                                               document_id=document_id,
                                                                               section_id=db_section.id,
                                                                               status=3)

@celery_app.task
def init_website_document_info(document_id: int, user_id: int):
    asyncio.run(handle_init_website_document_info(document_id=document_id))

@celery_app.task
def create_delete_temp_file_task(path: str):
    delay = 60
    delete_temp_file_with_delay(path, delay)
    
@celery_app.task
def update_file_document_markdown_with_mineru(document_id: int, 
                                              user_id: int):
    asyncio.run(handle_update_file_document_markdown_with_mineru(document_id=document_id,
                                                                 user_id=user_id))
    
@celery_app.task
def update_website_document_markdown_with_jina(document_id: int, 
                                               user_id: int):
    asyncio.run(handle_update_website_document_markdown_with_jina(document_id=document_id,
                                                                  user_id=user_id))

@celery_app.task
def update_ai_summary(document_id: int, 
                      user_id: int):
    asyncio.run(handle_update_ai_summary(document_id=document_id,
                                         user_id=user_id))
    
@celery_app.task
def add_embedding(document_id: int, 
                  user_id: int):
    asyncio.run(handle_add_embedding(document_id=document_id, 
                                     user_id=user_id))
        
@celery_app.task
def update_sections(sections: list[int],
                    document_id: int,
                    user_id: int):
    asyncio.run(handle_update_sections(sections=sections,
                                       document_id=document_id,
                                       user_id=user_id))

@celery_app.task
def update_section_use_document(section_id: int,
                                document_id: int,
                                user_id: int):
    asyncio.run(handle_update_section_use_document(section_id=section_id,
                                                   document_id=document_id,
                                                   user_id=user_id))