import os
from dotenv import load_dotenv
if os.environ.get('ENV') == 'dev':
    load_dotenv(override=True)

import uuid
import crud
import asyncio
from celery import Celery
from config.redis import REDIS_PORT, REDIS_URL
from config.base import BASE_DIR
from common.logger import log_exception, exception_logger
from common.ai import summary_section_with_origin, summary_document, summary_section
from common.vector import milvus_client, process_document
from common.common import get_user_remote_file_system
from protocol.engine import EngineUUID
from common.sql import SessionLocal
from engine.markitdown import MarkitdownEngine
from engine.jina import JinaEngine
from engine.mineru import MineruEngine
from engine.mineru_api import MineruApiEngine

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
    if db_user is None:
        raise Exception("User not found")
    
    remote_file_service = await get_user_remote_file_system(user_id=user_id)
    
    try:
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
        
        default_file_document_parse_user_engine_id = db_user.default_file_document_parse_user_engine_id
        if default_file_document_parse_user_engine_id is None:
            raise Exception("User does not have default document parsing engine")
        
        db_task = crud.task.get_document_transform_task_by_document_id(db=db,
                                                                    document_id=document_id)
        if db_task is None:
            raise Exception("Document transform task not found")
        
        db_task.status = 1
        db.commit()
        
        file_extractor = crud.engine.get_user_engine_by_user_engine_id(db=db, 
                                                                       user_engine_id=default_file_document_parse_user_engine_id)
        # download the file to the temp dir
        file_content = await remote_file_service.get_file_content_by_file_path(file_path=db_file_document.file_name)
        temp_file_path = f'{str(BASE_DIR)}/temp/{db_file_document.file_name.replace("files/", "")}'
        with open(temp_file_path, 'wb') as f:
            f.write(file_content)
            
        db_engine = crud.engine.get_engine_by_id(db=db, 
                                                 id=file_extractor.engine_id)
        if db_engine.uuid == EngineUUID.MinerU_API.value:
            engine = MineruApiEngine()
        if db_engine.uuid == EngineUUID.MarkitDown.value:
            engine = MarkitdownEngine()
        if db_engine.uuid == EngineUUID.Jina.value:
            engine = JinaEngine()
        if db_engine.uuid == EngineUUID.MinerU.value:
            engine = MineruEngine()
            
        await engine.init_engine_config_by_user_engine_id(user_engine_id=default_file_document_parse_user_engine_id)
        
        file_info = await engine.analyse_file(file_path=temp_file_path)

        db_document.title = file_info.title
        db_document.description = file_info.description
        db_document.cover = file_info.cover
        db.commit()
        
        db_file_document = crud.document.get_file_document_by_document_id(db=db, 
                                                                          document_id=document_id)
        md_file_name = f"markdown/{uuid.uuid4().hex}.md"
        await remote_file_service.upload_raw_content_to_path(file_path=md_file_name, 
                                                             content=file_info.content,
                                                             content_type="text/plain")
        crud.document.update_file_document_by_file_document_id(db=db,
                                                               file_document_id=db_file_document.id,
                                                               md_file_name=md_file_name)
        db_task.status = 2
        db.commit()
    except Exception as e:
        exception_logger.error(f"Something is error while init file document info: {e}")
        log_exception()
        db.rollback()
        db_task = crud.task.get_document_transform_task_by_document_id(db=db,
                                                                       document_id=document_id)
        db_task.status = 3
        db_document = crud.document.get_document_by_document_id(db=db,
                                                                document_id=document_id)
        db_document.title = f'Document Convert Error: {e}'
        db_document.description = f'Document Convert Error: {e}'
        db.commit()
        raise e
    finally:
        db.close()

async def handle_init_website_document_info(document_id: int, 
                                            user_id: int):
    db = SessionLocal()
    db_user = crud.user.get_user_by_id(db=db, 
                                       user_id=user_id)
    if db_user is None:
        raise Exception("User not found")
    
    remote_file_service = await get_user_remote_file_system(user_id=user_id)
    
    try:
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
        
        default_website_document_parse_user_engine_id = db_user.default_website_document_parse_user_engine_id
        if default_website_document_parse_user_engine_id is None:
            raise Exception("User does not have default website document parse engine")
        
        db_task = crud.task.get_document_transform_task_by_document_id(db=db,
                                                                       document_id=document_id)
        if db_task is None:
            raise Exception("Document transform task not found")
        
        db_task.status = 1
        db.commit()
        
        website_extractor = crud.engine.get_user_engine_by_user_engine_id(db=db, 
                                                                          user_engine_id=default_website_document_parse_user_engine_id)
        db_engine = crud.engine.get_engine_by_id(db=db,
                                                 id=website_extractor.engine_id)
        if db_engine.uuid == EngineUUID.MinerU_API.value:
            engine = MineruApiEngine()
        if db_engine.uuid == EngineUUID.MarkitDown.value:
            engine = MarkitdownEngine()
        if db_engine.uuid == EngineUUID.Jina.value:
            engine = JinaEngine()
        if db_engine.uuid == EngineUUID.MinerU.value:
            engine = MineruEngine()
            
        await engine.init_engine_config_by_user_engine_id(user_engine_id=default_website_document_parse_user_engine_id)
        
        web_info = await engine.analyse_website(url=db_website_document.url)
        db_document.title = web_info.title
        db_document.description = web_info.description
        db_document.cover = web_info.cover
        db.commit()

        db_website_document = crud.document.get_website_document_by_document_id(db=db, 
                                                                                document_id=document_id)
        md_file_name = f"markdown/{uuid.uuid4().hex}.md"
        await remote_file_service.upload_raw_content_to_path(file_path=md_file_name, 
                                                             content=web_info.content, 
                                                             content_type='text/plain')
        crud.document.update_website_document_by_website_document_id(db=db,
                                                                     website_document_id=db_website_document.id,
                                                                     md_file_name=md_file_name)
        db_task.status = 2
        db.commit()
    except Exception as e:
        exception_logger.error(f"Something is error while init website document info: {e}")
        log_exception()
        db.rollback()
        db_task = crud.task.get_document_transform_task_by_document_id(db=db,
                                                                       document_id=document_id)
        db_task.status = 3
        db_document = crud.document.get_document_by_document_id(db=db,
                                                                document_id=document_id)
        db_document.title = f'Document Convert Error: {e}'
        db_document.description = f'Document Convert Error: {e}'
        db.commit()
        raise e
    finally:
        db.close()

async def handle_add_embedding(document_id: int, 
                               user_id: int):
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
    finally:
        db.close()

async def handle_update_sections(sections: list[int], 
                                 document_id: int, 
                                 user_id: int):
    db = SessionLocal()
    db_user = crud.user.get_user_by_id(db=db, user_id=user_id)
    if db_user is None:
        raise Exception("User does not exist")
    remote_file_service = await get_user_remote_file_system(user_id=user_id)
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
            if db_user_section is None or db_user_section.authority == 2:
                raise Exception("User does not have permission to modify this section")
            db_section = crud.section.get_section_by_section_id(db=db,
                                                                section_id=section_id)
            try:
                # as the section may have no document binded, we need to check if it has documents
                if db_section.md_file_name is not None:
                        # get the original section summary
                        origin_section_summary = await remote_file_service.get_file_content_by_file_path(file_path=db_section.md_file_name)
                        # generate the new summary using the document
                        new_summary = summary_section_with_origin(user_id=user_id,
                                                                  model_id=db_user.default_document_reader_model_id,
                                                                  origin_section_markdown_content=origin_section_summary,
                                                                  new_document_markdown_content=markdown_content).get('summary')
                        # put the new summary into the file system
                        md_file_name = f"markdown/{uuid.uuid4().hex}.md"
                        await remote_file_service.upload_raw_content_to_path(file_path=md_file_name, 
                                                                             content=new_summary,
                                                                             content_type='text/plain')
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
                    await remote_file_service.upload_raw_content_to_path(file_path=md_file_name, 
                                                                         content=summary,
                                                                         content_type='text/plain')
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
        raise e
    finally:
        db.close()
        
async def get_markdown_content_by_document_id(document_id: int, user_id: int):
    db = SessionLocal()
    db_user = crud.user.get_user_by_id(db=db, user_id=user_id)
    if db_user is None:
        raise Exception("User does not exist")
    remote_file_service = await get_user_remote_file_system(user_id=user_id)
    try:
        db_document = crud.document.get_document_by_document_id(db=db,
                                                                document_id=document_id)
        if db_document is None:
            raise Exception("Document not found")
        if db_document.category == 1:
            website_document = crud.document.get_website_document_by_document_id(db=db,
                                                                                 document_id=document_id)
            if website_document is None:
                raise Exception("Website document not found")
            markdown_content = await remote_file_service.get_file_content_by_file_path(file_path=website_document.md_file_name)
        if db_document.category == 0:
            file_document = crud.document.get_file_document_by_document_id(db=db,
                                                                           document_id=document_id)
            if file_document is None:
                raise Exception("Website document not found")
            markdown_content = await remote_file_service.get_file_content_by_file_path(file_path=file_document.md_file_name)
        if db_document.category == 2:
            quick_note_document = crud.document.get_quick_note_document_by_document_id(db=db,
                                                                                       document_id=document_id)
            markdown_content = quick_note_document.content
    except Exception as e:
        exception_logger.error(f"Something is error while getting the markdown content: {e}")
        log_exception()
        raise e
    finally:
        db.close()
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
    finally:
        db.close()

async def handle_update_section_use_document(section_id: int,
                                             document_id: int,
                                             user_id: int):
    db = SessionLocal()
    db_user = crud.user.get_user_by_id(db=db, user_id=user_id)
    if db_user is None:
        raise Exception("User does not exist")
    remote_file_service = await get_user_remote_file_system(user_id=user_id)
    try:
        markdown_content = await get_markdown_content_by_document_id(document_id=document_id,
                                                                     user_id=user_id)
        db_user_section = crud.section.get_section_user_by_section_id_and_user_id(db=db,
                                                                                  section_id=section_id,
                                                                                  user_id=db_user.id)
        if db_user_section is None:
            raise Exception("User does not have permission to modify this section")
        if db_user_section.authority == 2:
            raise Exception("User does not have permission to modify this section")
        db_section = crud.section.get_section_by_section_id(db=db,
                                                            section_id=section_id)
        # as the section may have no document binded, we need to check if it has documents
        if db_section.md_file_name is not None:
                # get the original section summary
                origin_section_summary = await remote_file_service.get_file_content_by_file_path(file_path=db_section.md_file_name)
                # generate the new summary using the document
                new_summary = summary_section_with_origin(user_id=user_id,
                                                          model_id=db_user.default_document_reader_model_id,
                                                          origin_section_markdown_content=origin_section_summary,
                                                          new_document_markdown_content=markdown_content).get('summary')
                # put the new summary into the file system
                md_file_name = f"markdown/{uuid.uuid4().hex}.md"
                await remote_file_service.upload_raw_content_to_path(file_path=md_file_name, 
                                                                     content=new_summary,
                                                                     content_type="text/plain")
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
            await remote_file_service.upload_raw_content_to_path(file_path=md_file_name, 
                                                                 content=summary,
                                                                 content_type="text/plain")
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
        raise e
    finally:
        db.close()
        
@celery_app.task
def init_website_document_info(document_id: int, 
                               user_id: int):
    asyncio.run(handle_init_website_document_info(document_id=document_id, user_id=user_id))

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