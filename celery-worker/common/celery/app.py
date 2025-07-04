from dotenv import load_dotenv
load_dotenv(override=True)

import uuid
import crud
import asyncio
from celery import Celery
from config.redis import REDIS_PORT, REDIS_URL
from config.base import BASE_DIR
from common.common import create_upload_token
from common.logger import log_exception, exception_logger
from common.ai import summary_section_with_origin, summary_document, summary_section
from common.vector import milvus_client, process_document
from common.file import delete_temp_file_with_delay, RemoteFileService
from common.sql import SessionLocal
from engine import markitdown as markitdown_engine
from engine import jina as jina_engine
from engine import mineru as mineru_engine

import tracemalloc
import warnings

tracemalloc.start()
warnings.simplefilter("default")

celery_app = Celery('worker', 
                    broker=f'redis://{REDIS_URL}:{REDIS_PORT}/0',
                    backend=f'redis://{REDIS_URL}:{REDIS_PORT}/0')

async def handle_init_file_document_info(document_id: int, 
                                         user_id: int):
    db = SessionLocal()
    db_user = crud.user.get_user_by_id(db=db, 
                                       user_id=user_id)
    db_document = crud.document.get_document_by_document_id(db=db,
                                                            document_id=document_id)
    if db_document is None:
        raise Exception("Document not found")
    if db_document.category != 0:
        raise Exception("This task is only for file document")
    db_file_document = crud.document.get_file_document_by_document_id(db=db,
                                                                      document_id=document_id)
    if db_file_document is None:
        raise Exception("File document not found")
    default_file_document_parse_engine_id = db_user.default_file_document_parse_engine_id
    if default_file_document_parse_engine_id is None:
        raise Exception("User does not have default document parsing engine")
    file_extractor = crud.engine.get_engine_by_id(db=db, 
                                                  id=default_file_document_parse_engine_id)
    access_token = create_upload_token(user=db_user)
    remote_file_service = RemoteFileService(authorization=access_token)
    # download the file to the temp dir
    file_content = await remote_file_service.get_object_bytes(file_path=db_file_document.file_name)
    temp_file_path = f'{str(BASE_DIR)}/temp/{db_file_document.file_name.replace("files/", "")}'
    with open(temp_file_path, 'wb') as f:
        f.write(file_content)
        
    if file_extractor.name.lower() == "markitdown":
        engine = markitdown_engine.MarkitdownEngine(user_id=user_id)
        file_info = await engine.analyse_file(temp_file_path)
    if file_extractor.name.lower() == "mineru":
        engine = mineru_engine.MineruEngine(user_id=user_id)
        file_info = await engine.analyse_file(file_path=temp_file_path)
    if file_extractor.name.lower() == "jina":
        raise Exception("Jina engine for file document parsing is not supported yet")

    db_document.title = file_info.title
    db_document.description = file_info.description
    db_document.cover = file_info.cover

    db_task = crud.task.get_document_transform_task_by_document_id(db=db,
                                                                   document_id=document_id)
    if db_task is None:
        raise Exception("Document transform task not found")
    db_task.status = 1
    db.commit()
    db_file_document = crud.document.get_file_document_by_document_id(db=db, 
                                                                      document_id=document_id)
    md_file_name = f"markdown/{uuid.uuid4().hex}.md"
    await remote_file_service.put_object_with_raw_data(remote_file_path=md_file_name, raw_data=file_info.content)
    crud.document.update_file_document_by_file_document_id(db=db,
                                                           file_document_id=db_file_document.id,
                                                           md_file_name=md_file_name)
    db_task.status = 2
    db.commit()
    await remote_file_service.close_client()

async def handle_init_website_document_info(document_id: int, user_id: int):
    db = SessionLocal()
    db_user = crud.user.get_user_by_id(db=db, 
                                       user_id=user_id)
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
    default_website_document_parse_engine_id = db_user.default_website_document_parse_engine_id
    if default_website_document_parse_engine_id is None:
        raise Exception("User does not have default website document parse engine")
    website_extractor = crud.engine.get_engine_by_id(db=db, 
                                                     id=default_website_document_parse_engine_id)
    if website_extractor.name.lower() == "markitdown":
        engine = markitdown_engine.MarkitdownEngine(user_id=user_id)
        web_info = await engine.analyse_website(url=db_website_document.url)
    if website_extractor.name.lower() == "jina":
        engine = jina_engine.JinaEngine(user_id=user_id)
        web_info = await engine.analyse_website(url=db_website_document.url)
    if website_extractor.name.lower() == "mineru":
        engine = mineru_engine.MineruEngine(user_id=user_id)
        web_info = await engine.analyse_website(url=db_website_document.url)

    db_document.title = web_info.title
    db_document.description = web_info.description
    db_document.cover = web_info.cover

    access_token = create_upload_token(user=db_user)
    remote_file_service = RemoteFileService(authorization=access_token)
    db_task = crud.task.get_document_transform_task_by_document_id(db=db,
                                                                   document_id=document_id)
    if db_task is None:
        raise Exception("Document transform task not found")
    db_task.status = 1
    db.commit()
    db_website_document = crud.document.get_website_document_by_document_id(db=db, 
                                                                            document_id=document_id)
    md_file_name = f"markdown/{uuid.uuid4().hex}.md"
    await remote_file_service.put_object_with_raw_data(remote_file_path=md_file_name, raw_data=web_info.content)
    crud.document.update_website_document_by_website_document_id(db=db,
                                                                    website_document_id=db_website_document.id,
                                                                    md_file_name=md_file_name)
    db_task.status = 2
    db.commit()
    await remote_file_service.close_client()

async def handle_add_embedding(document_id: int, user_id: int):
    db = SessionLocal()
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
        await remote_file_service.close_client()
    except Exception as e:
        exception_logger.error(f"Something is error while getting the section: {e}")
        log_exception()
        db.rollback()
        await remote_file_service.close_client()
        
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
    await remote_file_service.close_client()
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
        await remote_file_service.close_client()
    except Exception as e:
            log_exception()
            exception_logger.error(f"Something is error while updating the section: {e}")
            db.rollback()
            crud.section.update_section_document_by_section_id_and_document_id(db=db,
                                                                               document_id=document_id,
                                                                               section_id=db_section.id,
                                                                               status=3)
            await remote_file_service.close_client()

@celery_app.task
def init_website_document_info(document_id: int, user_id: int):
    asyncio.run(handle_init_website_document_info(document_id=document_id, user_id=user_id))

@celery_app.task
def create_delete_temp_file_task(path: str):
    delay = 60
    delete_temp_file_with_delay(path, delay)
    
@celery_app.task
def init_file_document_info(document_id: int, 
                            user_id: int):
    asyncio.run(handle_init_file_document_info(document_id=document_id,
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