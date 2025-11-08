import os
from dotenv import load_dotenv
if os.environ.get('ENV') == 'dev':
    load_dotenv(override=True)

import httpx
import uuid
import crud
import asyncio
from celery import Celery
from schemas.task import DocumentOverrideProperty
from enums.document import DocumentProcessStatus
from config.redis import REDIS_PORT, REDIS_URL
from config.base import BASE_DIR
from common.logger import log_exception, exception_logger
from common.ai import summary_section_with_origin, summary_document, summary_section
from data.common import process_document
from common.common import get_user_remote_file_system
from enums.engine import EngineUUID
from common.sql import SessionLocal
from engine.markdown.markitdown import MarkitdownEngine
from engine.markdown.jina import JinaEngine
from engine.markdown.mineru import MineruEngine
from engine.markdown.mineru_api import MineruApiEngine
from engine.tts.volc.tts import VolcTTSEngine
from enums.document import DocumentCategory, DocumentMdConvertStatus, DocumentEmbeddingStatus, DocumentPodcastStatus
from enums.section import UserSectionAuthority, SectionPodcastStatus, SectionDocumentIntegration

import tracemalloc
import warnings

tracemalloc.start()
warnings.simplefilter("default")

celery_app = Celery('worker', 
                    broker=f'redis://{REDIS_URL}:{REDIS_PORT}/0',
                    backend=f'redis://{REDIS_URL}:{REDIS_PORT}/0')

async def handle_process_document(document_id: int, 
                                  user_id: int,
                                  auto_summary: bool = False,
                                  auto_podcast: bool = False,
                                  override: DocumentOverrideProperty | None = None):
    db = SessionLocal()
    db_document_process_task = crud.task.create_document_process_task(db=db,
                                                                      user_id=user_id,
                                                                      document_id=document_id)
    db.commit()
    db_document_process_task.status = DocumentProcessStatus.PROCESSING.value
    db.commit()
    db_user = crud.user.get_user_by_id(db=db, 
                                       user_id=user_id)
    if db_user is None:
        raise Exception("User not found")
    
    remote_file_service = await get_user_remote_file_system(user_id=user_id)
    await remote_file_service.init_client_by_user_file_system_id(user_file_system_id=db_user.default_user_file_system)
    
    try:
        db_document = crud.document.get_document_by_document_id(db=db,
                                                                document_id=document_id)
        if db_document is None:
            raise Exception("Document not found")
        
        # 如果是速记，就不需要转化流程，所以此处不用寻找转化记录
        if db_document.category != DocumentCategory.QUICK_NOTE:
            db_task = crud.task.get_document_transform_task_by_document_id(db=db,
                                                                        document_id=document_id)
            if db_task is None:
                raise Exception("Document transform task not found")
            
            db_task.status = DocumentMdConvertStatus.CONVERTING
            db.commit()
            
        md_extractor = crud.engine.get_user_engine_by_user_engine_id(db=db, 
                                                                     user_engine_id=db_user.default_file_document_parse_user_engine_id)
        
        if md_extractor is None:
            raise Exception("User engine not found")
        
        db_engine = crud.engine.get_engine_by_id(db=db, 
                                                 id=md_extractor.engine_id)
        
        if db_engine is None:
            raise Exception("Engine not found")
        
        if db_engine.uuid == EngineUUID.MinerU_API.value:
            engine = MineruApiEngine()
        if db_engine.uuid == EngineUUID.MarkitDown.value:
            engine = MarkitdownEngine()
        if db_engine.uuid == EngineUUID.Jina.value:
            engine = JinaEngine()
        if db_engine.uuid == EngineUUID.MinerU.value:
            engine = MineruEngine()
            
        await engine.init_engine_config_by_user_engine_id(user_engine_id=db_user.default_file_document_parse_user_engine_id)
        
        if db_document.category == DocumentCategory.FILE:
            # 处理文件文档
            db_file_document = crud.document.get_file_document_by_document_id(db=db,
                                                                              document_id=document_id)
            if db_file_document is None:
                raise Exception("File document not found")
            
            # download the file to the temp dir
            file_content = await remote_file_service.get_file_content_by_file_path(file_path=db_file_document.file_name)
            temp_file_path = f'{str(BASE_DIR)}/temp/{db_file_document.file_name.replace("files/", "")}'
            with open(temp_file_path, 'wb') as f:
                f.write(file_content)
                
            file_info = await engine.analyse_file(file_path=temp_file_path)

            db_document.title = file_info.title
            db_document.description = file_info.description
            db_document.cover = file_info.cover
            db.commit()

            md_file_name = f"markdown/{uuid.uuid4().hex}.md"
            await remote_file_service.upload_raw_content_to_path(file_path=md_file_name, 
                                                                 content=file_info.content,
                                                                 content_type="text/plain")
            crud.document.update_file_document_by_file_document_id(db=db,
                                                                   file_document_id=db_file_document.id,
                                                                   md_file_name=md_file_name)
            db_task.status = DocumentMdConvertStatus.SUCCESS
            db.commit()
            
        if db_document.category == DocumentCategory.WEBSITE:
            # 处理网页文档
            db_website_document = crud.document.get_website_document_by_document_id(db=db,
                                                                                    document_id=document_id)
            if db_website_document is None:
                raise Exception("Website document not found")
            
            web_info = await engine.analyse_website(url=db_website_document.url)
            
            db_document.title = web_info.title
            db_document.description = web_info.description
            db_document.cover = web_info.cover
            db.commit()
            
            md_file_name = f"markdown/{uuid.uuid4().hex}.md"
            await remote_file_service.upload_raw_content_to_path(file_path=md_file_name, 
                                                                 content=web_info.content, 
                                                                 content_type='text/plain')
            crud.document.update_website_document_by_website_document_id(db=db,
                                                                         website_document_id=db_website_document.id,
                                                                         md_file_name=md_file_name)
            db_task.status = DocumentMdConvertStatus.SUCCESS
            db.commit()
            
        if override is not None:
            if override.get('cover') is not None:
                db_document.cover = override.get('cover')
            if override.get('title') is not None:
                db_document.title = override.get('title')
            if override.get('description') is not None:
                db_document.description = override.get('description')
            db.commit()
        
        # embedding
        await handle_add_embedding(document_id=db_document.id,
                                   user_id=user_id)
        
        # 更新对应专栏section
        sections = crud.section.get_document_sections_by_document_id(db=db, document_id=document_id)
        sections_ids = [sec.id for sec in sections]
        await handle_update_sections(sections=sections_ids, 
                                     document_id=document_id, 
                                     user_id=user_id)
        
        if auto_summary:
            await handle_update_ai_summary(document_id=db_document.id,
                                           user_id=user_id)
        if auto_podcast:
            await handle_update_ai_podcast(document_id=db_document.id,
                                           user_id=user_id)
        db_document_process_task.status = DocumentProcessStatus.SUCCESS.value
        db.commit()

    except Exception as e:
        exception_logger.error(f"Something is error while process document info: {e}")
        log_exception()
        db.rollback()
        # 同样的 如果是速记，不需要查找和修改转化记录
        if db_document.category != DocumentCategory.QUICK_NOTE:
            db_task = crud.task.get_document_transform_task_by_document_id(db=db,
                                                                        document_id=document_id)
            db_task.status = DocumentMdConvertStatus.FAILED
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
    db_embedding_task = crud.task.create_document_embedding_task(db=db,
                                                                 user_id=user_id,
                                                                 document_id=document_id)
    try:
        db_embedding_task.status = DocumentEmbeddingStatus.EMBEDDING
        await process_document(user_id=user_id, doc_id=document_id)
        db_embedding_task.status = DocumentEmbeddingStatus.SUCCESS
        db.commit()
    except Exception as e:
        db_embedding_task.status = DocumentEmbeddingStatus.FAILED
        exception_logger.error(f"Something is error while embedding the document and write into the milvus: {e}")
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
    await remote_file_service.init_client_by_user_file_system_id(user_file_system_id=db_user.default_user_file_system)
    
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
            if db_user_section is None or db_user_section.authority == UserSectionAuthority.READ_ONLY:
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
                                                                                   status=SectionDocumentIntegration.SUCCESS)
                if db_section.auto_podcast:
                    await handle_update_section_ai_podcast(section_id=section_id, user_id=user_id)
                
            except Exception as e:
                    log_exception()
                    exception_logger.error(f"Something is error while updating the section: {e}")
                    db.rollback()
                    crud.section.update_section_document_by_section_id_and_document_id(db=db,
                                                                                       document_id=document_id,
                                                                                       section_id=db_section.id,
                                                                                       status=SectionDocumentIntegration.FAILED)
        db.commit()
    except Exception as e:
        exception_logger.error(f"Something is error while getting the section: {e}, parameter: {sections}, {document_id}, {user_id}")
        log_exception()
        db.rollback()
        raise e
    finally:
        db.close()
        
async def get_markdown_content_by_section_id(section_id: int, user_id: int):
    db = SessionLocal()
    db_user = crud.user.get_user_by_id(db=db, user_id=user_id)
    if db_user is None:
        raise Exception("User does not exist")
    remote_file_service = await get_user_remote_file_system(user_id=user_id)
    await remote_file_service.init_client_by_user_file_system_id(user_file_system_id=db_user.default_user_file_system)
    
    try:
        db_section = crud.section.get_section_by_section_id(db=db, section_id=section_id)
        if db_section is None:
            raise Exception("Section not found")
        markdown_content = await remote_file_service.get_file_content_by_file_path(file_path=db_section.md_file_name)
    except Exception as e:
        exception_logger.error(f"Something is error while getting the section: {e}, parameter: {section_id}, {user_id}")
        log_exception()
        db.rollback()
        raise e
    finally:
        db.close()
    return markdown_content
        
async def get_markdown_content_by_document_id(document_id: int, user_id: int):
    db = SessionLocal()
    db_user = crud.user.get_user_by_id(db=db, user_id=user_id)
    if db_user is None:
        raise Exception("User does not exist")
    remote_file_service = await get_user_remote_file_system(user_id=user_id)
    await remote_file_service.init_client_by_user_file_system_id(user_file_system_id=db_user.default_user_file_system)
    
    try:
        db_document = crud.document.get_document_by_document_id(db=db,
                                                                document_id=document_id)
        if db_document is None:
            raise Exception("Document not found")
        if db_document.category == DocumentCategory.WEBSITE:
            website_document = crud.document.get_website_document_by_document_id(db=db,
                                                                                 document_id=document_id)
            if website_document is None:
                raise Exception("Website document not found")
            markdown_content = await remote_file_service.get_file_content_by_file_path(file_path=website_document.md_file_name)
        if db_document.category == DocumentCategory.FILE:
            file_document = crud.document.get_file_document_by_document_id(db=db,
                                                                           document_id=document_id)
            if file_document is None:
                raise Exception("Website document not found")
            markdown_content = await remote_file_service.get_file_content_by_file_path(file_path=file_document.md_file_name)
        if db_document.category == DocumentCategory.QUICK_NOTE:
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

async def handle_update_section_ai_podcast(section_id: int,
                                           user_id: int):
    db = SessionLocal()
    try:
        db_user = crud.user.get_user_by_id(db=db, 
                                           user_id=user_id)
        if db_user is None:
            raise Exception("User not found")
        
        remote_file_service = await get_user_remote_file_system(user_id=user_id)
        await remote_file_service.init_client_by_user_file_system_id(user_file_system_id=db_user.default_user_file_system)
        
        db_section_podcast_task = crud.task.create_section_podcast_task(db=db,
                                                                        user_id=user_id,
                                                                        section_id=section_id)
        db_section = crud.section.get_section_by_section_id(db=db,
                                                            section_id=section_id)
        markdown_content = await get_markdown_content_by_section_id(section_id=section_id,
                                                                    user_id=user_id)
        db_user = crud.user.get_user_by_id(db=db,
                                           user_id=user_id)
        
        podcast_generator = crud.engine.get_user_engine_by_user_engine_id(db=db, 
                                                                          user_engine_id=db_user.default_podcast_user_engine_id)
        
        if podcast_generator is None:
            raise Exception("User engine not found")
        
        db_engine = crud.engine.get_engine_by_id(db=db, 
                                                 id=podcast_generator.engine_id)
        
        if db_engine is None:
            raise Exception("Engine not found")
        
        if db_engine.uuid == EngineUUID.Volc_TTS.value:
            engine = VolcTTSEngine()
            
        db_section_podcast_task.status = SectionPodcastStatus.PROCESSING
        db.commit()
        
        await engine.init_engine_config_by_user_engine_id(user_engine_id=db_user.default_podcast_user_engine_id)
        
        podcast_result = await engine.synthesize(text=markdown_content)
        audio_bytes = httpx.get(url=str(podcast_result)).content
        podcast_file_name = f"files/{uuid.uuid4().hex}.mp3"
        await remote_file_service.upload_raw_content_to_path(file_path=podcast_file_name, 
                                                             content=audio_bytes,
                                                             content_type="audio/mpeg")
        
        if podcast_result is None:
            db_section_podcast_task.status = SectionPodcastStatus.FAILED
            db.commit()
            raise Exception("Podcast result is None")

        section_podcast = crud.section.get_section_podcast_by_section_id(db=db,
                                                                         section_id=section_id)
        if section_podcast is not None:
            crud.section.delete_section_podcast_by_section_id(db=db,
                                                              user_id=user_id,
                                                              section_id=section_id)
    
        db_section_podcast = crud.section.create_section_podcast(db=db,
                                                                 section_id=section_id,
                                                                 podcast_file_name=podcast_file_name)
        db.commit()
        
        db_section_podcast.podcast_file_name = podcast_file_name
        db_section_podcast_task.status = SectionPodcastStatus.SUCCESS
        db.commit()

    except Exception as e:
        exception_logger.error(f"Something is error while updating the ai podcast: {e}")
        log_exception()
        db.rollback()
    finally:
        db.close()

async def handle_update_document_ai_podcast(document_id: int, 
                                            user_id: int):
    db = SessionLocal()
    try:
        db_user = crud.user.get_user_by_id(db=db, 
                                           user_id=user_id)
        if db_user is None:
            raise Exception("User not found")
        
        remote_file_service = await get_user_remote_file_system(user_id=user_id)
        await remote_file_service.init_client_by_user_file_system_id(user_file_system_id=db_user.default_user_file_system)
        db_document_podcast_task = crud.task.create_document_podcast_task(db=db,
                                                                          user_id=user_id,
                                                                          document_id=document_id)
        db_document = crud.document.get_document_by_document_id(db=db,
                                                                document_id=document_id)
        markdown_content = await get_markdown_content_by_document_id(document_id=db_document.id,
                                                                     user_id=user_id)
        db_user = crud.user.get_user_by_id(db=db,
                                           user_id=user_id)
        
        podcast_generator = crud.engine.get_user_engine_by_user_engine_id(db=db, 
                                                                          user_engine_id=db_user.default_podcast_user_engine_id)
        
        if podcast_generator is None:
            raise Exception("User engine not found")
        
        db_engine = crud.engine.get_engine_by_id(db=db, 
                                                 id=podcast_generator.engine_id)
        
        if db_engine is None:
            raise Exception("Engine not found")
        
        if db_engine.uuid == EngineUUID.Volc_TTS.value:
            engine = VolcTTSEngine()
            
        db_document_podcast_task.status = DocumentPodcastStatus.PROCESSING
        db.commit()
        
        await engine.init_engine_config_by_user_engine_id(user_engine_id=db_user.default_podcast_user_engine_id)
        
        podcast_result = await engine.synthesize(text=markdown_content)
        audio_bytes = httpx.get(url=str(podcast_result)).content
        podcast_file_name = f"files/{uuid.uuid4().hex}.mp3"
        await remote_file_service.upload_raw_content_to_path(file_path=podcast_file_name, 
                                                             content=audio_bytes,
                                                             content_type="audio/mpeg")
        
        if podcast_result is None:
            db_document_podcast_task.status = DocumentPodcastStatus.FAILED
            db.commit()
            raise Exception("Podcast result is None")
        
        document_podcast = crud.document.get_document_podcast_by_document_id(db=db,
                                                                             document_id=document_id)
        if document_podcast is not None:
            crud.document.delete_document_podcast_by_document_id(db=db,
                                                                 user_id=user_id,
                                                                 document_id=document_id)
            
        db_document_podcast = crud.document.create_document_podcast(db=db,
                                                                    document_id=document_id,
                                                                    podcast_file_name=podcast_file_name)
        db.commit()
        
        db_document_podcast.podcast_file_name = podcast_file_name
        db_document_podcast_task.status = DocumentPodcastStatus.SUCCESS
        db.commit()
                                                                             
    except Exception as e:
        exception_logger.error(f"Something is error while updating the ai podcast: {e}")
        log_exception()
        db.rollback()
    finally:
        db.close()
        
async def handle_update_ai_summary(document_id: int, 
                                   user_id: int):
    db = SessionLocal()
    try:
        db_document = crud.document.get_document_by_document_id(db=db,
                                                                document_id=document_id)
        markdown_content = await get_markdown_content_by_document_id(document_id=db_document.id,
                                                                     user_id=user_id)
        db_user = crud.user.get_user_by_id(db=db, 
                                           user_id=user_id)
        ai_summary_result = summary_document(user_id=user_id, 
                                             model_id=db_user.default_document_reader_model_id, 
                                             markdown_content=markdown_content)
        crud.document.update_document_by_document_id(db=db,
                                                     document_id=db_document.id,
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
    await remote_file_service.init_client_by_user_file_system_id(user_file_system_id=db_user.default_user_file_system)
    
    try:
        markdown_content = await get_markdown_content_by_document_id(document_id=document_id,
                                                                     user_id=user_id)
        db_user_section = crud.section.get_section_user_by_section_id_and_user_id(db=db,
                                                                                  section_id=section_id,
                                                                                  user_id=db_user.id)
        if db_user_section is None:
            raise Exception("User does not have permission to modify this section")
        if db_user_section.authority == UserSectionAuthority.READ_ONLY:
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
                                                                           status=SectionDocumentIntegration.SUCCESS)
    except Exception as e:
        log_exception()
        exception_logger.error(f"Something is error while updating the section: {e}")
        db.rollback()
        crud.section.update_section_document_by_section_id_and_document_id(db=db,
                                                                            document_id=document_id,
                                                                            section_id=db_section.id,
                                                                            status=SectionDocumentIntegration.FAILED)
        raise e
    finally:
        db.close()
        
@celery_app.task
def start_process_document(document_id: int,
                           user_id: int,
                           auto_summary: bool = False,
                           auto_podcast: bool = False,
                           override: DocumentOverrideProperty | None = None):
    asyncio.run(handle_process_document(document_id=document_id, user_id=user_id, auto_summary=auto_summary, auto_podcast=auto_podcast, override=override))
    
@celery_app.task
def update_sections(document_id: int,
                    user_id: int):
    db = SessionLocal()
    sections = crud.section.get_document_sections_by_document_id(db=db, document_id=document_id)
    section_ids = [section.id for section in sections]
    asyncio.run(handle_update_sections(sections=section_ids,
                                       document_id=document_id, 
                                       user_id=user_id))
    db.close()
    
@celery_app.task
def start_process_document_podcast(document_id: int,
                                   user_id: int):
    asyncio.run(handle_update_document_ai_podcast(document_id=document_id, user_id=user_id))
    
@celery_app.task
def update_document_process_status(document_id: int,
                                   status: int):
    db = SessionLocal()
    db_document_process_task = crud.task.get_document_process_task_by_document_id(db=db,
                                                                                  document_id=document_id)
    if db_document_process_task is not None:
        db_document_process_task.status = status
        db.commit()
    db.close()
    
@celery_app.task
def start_process_section_podcast(section_id: int,
                                  user_id: int):
    asyncio.run(handle_update_section_ai_podcast(section_id=section_id, user_id=user_id))