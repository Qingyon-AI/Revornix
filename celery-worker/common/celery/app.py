import os
from dotenv import load_dotenv
if os.environ.get('ENV') == 'dev':
    load_dotenv(override=True)

import httpx
import uuid
import crud
import asyncio
from celery import Celery
from schemas.task import DocumentOverrideProperty, SectionOverrideProperty
from enums.document import DocumentProcessStatus
from config.redis import REDIS_PORT, REDIS_URL
from config.base import BASE_DIR
from common.logger import exception_logger
from common.ai import summary_section_with_origin, summary_document, summary_section
from data.common import process_document
from common.common import get_user_remote_file_system
from common.sql import SessionLocal
from engine.markdown.markitdown import MarkitdownEngine
from engine.markdown.jina import JinaEngine
from engine.markdown.mineru import MineruEngine
from engine.markdown.mineru_api import MineruApiEngine
from engine.tts.volc.tts import VolcTTSEngine
from enums.engine import EngineUUID
from enums.document import DocumentCategory, DocumentMdConvertStatus, DocumentEmbeddingStatus, DocumentPodcastStatus
from enums.section import UserSectionAuthority, SectionPodcastStatus, SectionDocumentIntegration, SectionProcessStatus
from notification.common import trigger_user_notification_event
from enums.notification import NotificationTriggerEventUUID

celery_app = Celery('worker', broker=f'redis://{REDIS_URL}:{REDIS_PORT}/0')

async def get_markdown_content_by_section_id(
    section_id: int, 
    user_id: int
):
    db = SessionLocal()
    try:
        db_user = crud.user.get_user_by_id(
            db=db, 
            user_id=user_id
        )
        if db_user is None:
            raise Exception("The user who want to get the markdown content is not found")
        if db_user.default_user_file_system is None:
            raise Exception("The user who want to get the markdown content does not have a default user file system")
        
        remote_file_service = await get_user_remote_file_system(
            user_id=user_id
        )
        await remote_file_service.init_client_by_user_file_system_id(
            user_file_system_id=db_user.default_user_file_system
        )
        
        db_section = crud.section.get_section_by_section_id(
            db=db, 
            section_id=section_id
        )
        if db_section is None:
            raise Exception("The section which you want to get the markdown content is not found")
        if db_section.md_file_name is None:
            raise Exception("The section which you want to get the markdown content does not have a markdown file")
        markdown_content = await remote_file_service.get_file_content_by_file_path(
            file_path=db_section.md_file_name
        )
        return markdown_content
    except Exception as e:
        exception_logger.error(f"Something is error while getting the section: {e}, parameter: {section_id}, {user_id}")
        raise e
    finally:
        db.close()

async def get_markdown_content_by_document_id(
    document_id: int, 
    user_id: int
):
    db = SessionLocal()
    db_user = crud.user.get_user_by_id(
        db=db, 
        user_id=user_id
    )
    if db_user is None:
        raise Exception("The user does not exist")
    if db_user.default_user_file_system is None:
        raise Exception("The user havn't set the default file system")
    
    remote_file_service = await get_user_remote_file_system(
        user_id=user_id
    )
    
    await remote_file_service.init_client_by_user_file_system_id(
        user_file_system_id=db_user.default_user_file_system
    )
    
    try:
        db_document = crud.document.get_document_by_document_id(
            db=db,
            document_id=document_id
        )
        if db_document is None:
            raise Exception("Document not found")
        if db_document.category == DocumentCategory.WEBSITE or db_document.category == DocumentCategory.FILE:
            db_convert_task = crud.task.get_document_convert_task_by_document_id(
                db=db,
                document_id=document_id
            )
            if db_convert_task is None or db_convert_task.status != DocumentMdConvertStatus.SUCCESS or db_convert_task.md_file_name is None:
                raise Exception("The document convert task of the document you want to summary havn't been finished")
            markdown_content = await remote_file_service.get_file_content_by_file_path(
                file_path=db_convert_task.md_file_name
            )
        elif db_document.category == DocumentCategory.QUICK_NOTE:
            quick_note_document = crud.document.get_quick_note_document_by_document_id(
                db=db,
                document_id=document_id
            )
            if quick_note_document is None:
                raise Exception("The quick note info of the document is not found")
            markdown_content = quick_note_document.content
        else:
            raise Exception("Document category not supported")
    except Exception as e:
        exception_logger.error(f"Something is error while getting the markdown content: {e}")
        raise e
    finally:
        db.close()
    return markdown_content

async def handle_update_document_ai_podcast(
    document_id: int, 
    user_id: int
):
    db = SessionLocal()
    db_podcast_task = crud.task.get_document_podcast_task_by_document_id(
        db=db,
        document_id=document_id
    )
    if db_podcast_task is None:
        db_podcast_task = crud.task.create_document_podcast_task(
            db=db,
            user_id=user_id,
            document_id=document_id,
            status = DocumentPodcastStatus.GENERATING
        )
    else:
        if db_podcast_task.status == DocumentPodcastStatus.GENERATING:
            db_podcast_task.status = DocumentPodcastStatus.GENERATING
    db.commit()
    try:
        db_document = crud.document.get_document_by_document_id(
            db=db,
            document_id=document_id
        )
        if db_document is None:
            raise Exception("The document which you want to create the podcast is not found")
        
        db_user = crud.user.get_user_by_id(
            db=db, 
            user_id=user_id
        )
        if db_user is None:
            raise Exception("The document's creator is not found")
        if db_user.default_user_file_system is None:
            raise Exception("The document's creator has not set the default file system")
        if db_user.default_podcast_user_engine_id is None:
            raise Exception("The document's creator has not set the default podcast generate engine")
        db_podcast_generator = crud.engine.get_user_engine_by_user_engine_id(
            db=db, 
            user_engine_id=db_user.default_podcast_user_engine_id
        )
        if db_podcast_generator is None:
            raise Exception("There is something wrong with the user's default podcast generate engine")
        db_engine = crud.engine.get_engine_by_id(
            db=db, 
            id=db_podcast_generator.engine_id
        )
        if db_engine is None:
            raise Exception("There is something wrong with the user's default podcast generate engine")
        
        remote_file_service = await get_user_remote_file_system(
            user_id=user_id
        )
        await remote_file_service.init_client_by_user_file_system_id(
            user_file_system_id=db_user.default_user_file_system
        )
        
        markdown_content = await get_markdown_content_by_document_id(
            document_id=db_document.id,
            user_id=user_id
        )
        
        if db_engine.uuid == EngineUUID.Volc_TTS.value:
            engine = VolcTTSEngine()
        
        await engine.init_engine_config_by_user_engine_id(
            user_engine_id=db_user.default_podcast_user_engine_id
        )
        
        podcast_result = await engine.synthesize(
            text=markdown_content
        )
        audio_bytes = httpx.get(url=str(podcast_result)).content
        podcast_file_name = f"files/{uuid.uuid4().hex}.mp3"
        await remote_file_service.upload_raw_content_to_path(
            file_path=podcast_file_name, 
            content=audio_bytes,
            content_type="audio/mpeg"
        )
        
        if podcast_result is None:
            db_podcast_task.status = DocumentPodcastStatus.FAILED
            db.commit()
            raise Exception("The podcast of the document is not generated because of the error of the engine")
        
        db_podcast_task.status = DocumentPodcastStatus.SUCCESS
        db_podcast_task.podcast_file_name = podcast_file_name
        db.commit()                            
    except Exception as e:
        exception_logger.error(f"Something is error while updating the ai podcast: {e}")
        db_podcast_task.status = DocumentPodcastStatus.FAILED
        db.commit()
        raise e
    finally:
        db.close()
        
async def handle_update_document_ai_summary(
    document_id: int, 
    user_id: int
):
    db = SessionLocal()
    try:
        db_document = crud.document.get_document_by_document_id(
            db=db,
            document_id=document_id
        )
        if db_document is None:
            raise Exception("The document which you want to create the ai summary is not found")
        db_user = crud.user.get_user_by_id(
            db=db, 
            user_id=user_id
        )
        if db_user is None:
            raise Exception("The user who want to create the ai summary for document is not found")
        if db_user.default_document_reader_model_id is None:
            raise Exception("The user who want to create the ai summary for document has not set the default document reader model")
        
        markdown_content = await get_markdown_content_by_document_id(
            document_id=db_document.id,
            user_id=user_id
        )
        
        ai_summary_result = summary_document(
            user_id=user_id, 
            model_id=db_user.default_document_reader_model_id, 
            markdown_content=markdown_content
        )
        
        db_document.title = ai_summary_result.title
        db_document.description = ai_summary_result.description
        db_document.ai_summary = ai_summary_result.summary
        
        db.commit()
    except Exception as e:
        exception_logger.error(f"Something is error while updating the ai summary: {e}")
        raise e
    finally:
        db.close()

async def handle_convert_document_md(
    document_id: int,
    user_id: int
):
    db = SessionLocal()
    db_convert_task = crud.task.get_document_convert_task_by_document_id(
        db=db,
        document_id=document_id
    )
    if db_convert_task is None:
        db_convert_task = crud.task.create_document_convert_task(
            db=db,
            user_id=user_id,
            document_id=document_id,
            status=DocumentMdConvertStatus.CONVERTING
        )
    else:
        if db_convert_task.status != DocumentMdConvertStatus.CONVERTING:
            db_convert_task.status = DocumentMdConvertStatus.CONVERTING
    db.commit()
    try:
        db_user = crud.user.get_user_by_id(
            db=db, 
            user_id=user_id
        )
        if db_user is None:
            raise Exception("The user which you want to process document is not found")
        if db_user.default_user_file_system is None:
            raise Exception("The user which you want to process document has not set default user file system")
        if db_user.default_file_document_parse_user_engine_id is None:
            raise Exception("The user which you want to process document has not set default file document parse user engine")
        db_document = crud.document.get_document_by_document_id(
            db=db,
            document_id=document_id
        )
        if db_document is None:
            raise Exception("The document you want to process is not found")
        md_extractor = crud.engine.get_user_engine_by_user_engine_id(
            db=db, 
            user_engine_id=db_user.default_file_document_parse_user_engine_id
        )
        if md_extractor is None:
            raise Exception("There are something wrong with the user's markdown convert engine")
        db_engine = crud.engine.get_engine_by_id(
            db=db, 
            id=md_extractor.engine_id
        )
        if db_engine is None:
            raise Exception("There are something wrong with the user's markdown convert engine")
        
        remote_file_service = await get_user_remote_file_system(
            user_id=user_id
        )
        await remote_file_service.init_client_by_user_file_system_id(
            user_file_system_id=db_user.default_user_file_system
        )
        
        if db_engine.uuid == EngineUUID.MinerU_API.value:
            engine = MineruApiEngine()
        elif db_engine.uuid == EngineUUID.MarkitDown.value:
            engine = MarkitdownEngine()
        elif db_engine.uuid == EngineUUID.Jina.value:
            engine = JinaEngine()
        elif db_engine.uuid == EngineUUID.MinerU.value:
            engine = MineruEngine()
        else:
            raise Exception("The convert engine is not supported")
        
        await engine.init_engine_config_by_user_engine_id(
            user_engine_id=db_user.default_file_document_parse_user_engine_id
        )

        if db_document.category == DocumentCategory.QUICK_NOTE:
            # 目前的设计架构 速记模式在api请求时候已经填充了数据，后台任务不需要convert处理
            pass
        
        elif db_document.category == DocumentCategory.FILE:
            db_file_document = crud.document.get_file_document_by_document_id(
                db=db,
                document_id=document_id
            )
            if db_file_document is None:
                raise Exception("The document you want to process do not have a the file info")
            
            # download the file to the temp dir
            file_content = await remote_file_service.get_file_content_by_file_path(
                file_path=db_file_document.file_name
            )
            temp_file_path = f'{str(BASE_DIR)}/temp/{db_file_document.file_name.replace("files/", "")}'
            with open(temp_file_path, 'wb') as f:
                f.write(file_content)
                
            file_info = await engine.analyse_file(
                file_path=temp_file_path
            )

            db_document.title = file_info.title
            db_document.description = file_info.description
            db_document.cover = file_info.cover
            db.commit()

            if file_info.content is None:
                raise Exception("The file content which generated by the engine is empty")
            
            md_file_name = f"markdown/{uuid.uuid4().hex}.md"
            await remote_file_service.upload_raw_content_to_path(
                file_path=md_file_name, 
                content=file_info.content.encode("utf-8"),
                content_type="text/plain"
            )

        elif db_document.category == DocumentCategory.WEBSITE:
            db_website_document = crud.document.get_website_document_by_document_id(
                db=db,
                document_id=document_id
            )
            if db_website_document is None:
                raise Exception("The document you want to process do not have a the website info")
            
            web_info = await engine.analyse_website(
                url=db_website_document.url
            )
            
            db_document.title = web_info.title
            db_document.description = web_info.description
            db_document.cover = web_info.cover
            db.commit()
            
            if web_info.content is None:
                raise Exception("The website content which generated by the engine is empty")
            
            md_file_name = f"markdown/{uuid.uuid4().hex}.md"
            await remote_file_service.upload_raw_content_to_path(
                file_path=md_file_name, 
                content=web_info.content.encode("utf-8"), 
                content_type='text/plain'
            )
        db_convert_task.status = DocumentMdConvertStatus.SUCCESS
        db_convert_task.md_file_name = md_file_name
        db.commit()
    except Exception as e:
        exception_logger.error(f"Something is error while converting the document to markdown: {e}")
        db_convert_task.status = DocumentMdConvertStatus.FAILED
        db.commit()
        db_document = crud.document.get_document_by_document_id(
            db=db,
            document_id=document_id
        )
        if db_document is None:
            raise Exception("The document you want to process is not found")
        db_document.title = f'Document Convert Error'
        db_document.description = f'Document Convert Error: {e}'
        db.commit()
        raise e
    finally:
        db.close()
        
async def handle_add_embedding(
    document_id: int, 
    user_id: int
):
    db = SessionLocal()
    db_embedding_task = crud.task.get_document_embedding_task_by_document_id(
        db=db,
        document_id=document_id
    )
    if db_embedding_task is None:                                                                 
        db_embedding_task = crud.task.create_document_embedding_task(
            db=db,
            user_id=user_id,
            document_id=document_id
        )
    else:
        if db_embedding_task.status != DocumentEmbeddingStatus.EMBEDDING:
            db_embedding_task.status = DocumentEmbeddingStatus.EMBEDDING
    db.commit()
    try:
        await process_document(
            user_id=user_id, 
            doc_id=document_id
        )
        db_embedding_task.status = DocumentEmbeddingStatus.SUCCESS
        db.commit()
    except Exception as e:
        exception_logger.error(f"Something is error while embedding the document and write into the milvus: {e}")
        db_embedding_task.status = DocumentEmbeddingStatus.FAILED
        db.commit()
        raise e
    finally:
        db.close()

async def handle_process_document(
    document_id: int, 
    user_id: int,
    auto_summary: bool = False,
    auto_podcast: bool = False,
    override: DocumentOverrideProperty | None = None
):
    db = SessionLocal()
    db_document_process_task = crud.task.get_document_process_task_by_document_id(
        db=db,
        document_id=document_id
    )
    if db_document_process_task is None:
        db_document_process_task = crud.task.create_document_process_task(
            db=db,
            user_id=user_id,
            document_id=document_id,
            status=DocumentProcessStatus.PROCESSING
        )
    else:
        if db_document_process_task.status != DocumentProcessStatus.PROCESSING:
            db_document_process_task.status = DocumentProcessStatus.PROCESSING
    db.commit()
    
    try:
        db_user = crud.user.get_user_by_id(
            db=db, 
            user_id=user_id
        )
        if db_user is None:
            raise Exception("The user which you want to process document is not found")
        if db_user.default_user_file_system is None:
            raise Exception("The user which you want to process document has not set default user file system")
        if db_user.default_file_document_parse_user_engine_id is None:
            raise Exception("The user which you want to process document has not set default file document parse user engine")
        db_document = crud.document.get_document_by_document_id(
            db=db,
            document_id=document_id
        )
        if db_document is None:
            raise Exception("The document you want to process is not found")
        md_extractor = crud.engine.get_user_engine_by_user_engine_id(
            db=db, 
            user_engine_id=db_user.default_file_document_parse_user_engine_id
        )
        if md_extractor is None:
            raise Exception("There are something wrong with the user's markdown convert engine")
        db_engine = crud.engine.get_engine_by_id(
            db=db, 
            id=md_extractor.engine_id
        )
        if db_engine is None:
            raise Exception("There are something wrong with the user's markdown convert engine")
        
        remote_file_service = await get_user_remote_file_system(
            user_id=user_id
        )
        await remote_file_service.init_client_by_user_file_system_id(
            user_file_system_id=db_user.default_user_file_system
        )
        
        # converting
        await handle_convert_document_md(
            document_id=document_id,
            user_id=user_id
        )
        
        if override is not None:
            if override.cover is not None:
                db_document.cover = override.cover
            if override.title is not None:
                db_document.title = override.title
            if override.description is not None:
                db_document.description = override.description
            db.commit()

        # embedding
        await handle_add_embedding(
            document_id=db_document.id,
            user_id=user_id
        )
        
        # summary
        if auto_summary:
            await handle_update_document_ai_summary(
                document_id=db_document.id,
                user_id=user_id
            )

        # podcast
        if auto_podcast:
            await handle_update_document_ai_podcast(
                document_id=db_document.id,
                user_id=user_id
            )

        db_document_process_task.status = DocumentProcessStatus.SUCCESS.value
        db.commit()
    except Exception as e:
        exception_logger.error(f"Something is error while process document info: {e}")
        db_document_process_task.status = DocumentProcessStatus.FAILED
        db.commit()
        raise e
    finally:
        db.close()

async def handle_update_section_ai_podcast(
    section_id: int,
    user_id: int
):
    db = SessionLocal()
    db_podcast_task = crud.task.get_section_podcast_task_by_section_id(
        db=db,
        section_id=section_id
    )
    if db_podcast_task is None:
        db_podcast_task = crud.task.create_section_podcast_task(
            db=db,
            user_id=user_id,
            section_id=section_id,
            status = SectionPodcastStatus.GENERATING
        )
    else:
        if db_podcast_task.status != SectionPodcastStatus.GENERATING:
            db_podcast_task.status = SectionPodcastStatus.GENERATING
    db.commit()
    try:
        db_user = crud.user.get_user_by_id(
            db=db, 
            user_id=user_id
        )
        if db_user is None:
            raise Exception("The user who want to process section is not found")
        if db_user.default_user_file_system is None:
            raise Exception("The user who want to process section has not set default user file system")
        if db_user.default_podcast_user_engine_id is None:
            raise Exception("The user who want to process section has not set default podcast user engine")
        podcast_generator = crud.engine.get_user_engine_by_user_engine_id(
            db=db, 
            user_engine_id=db_user.default_podcast_user_engine_id
        )
        if podcast_generator is None:
            raise Exception("There is something wrong with the user's podcast generator engine")
        db_engine = crud.engine.get_engine_by_id(
            db=db, 
            id=podcast_generator.engine_id
        )
        if db_engine is None:
            raise Exception("There is something wrong with the user's podcast generator engine")
        
        remote_file_service = await get_user_remote_file_system(
            user_id=user_id
        )
        await remote_file_service.init_client_by_user_file_system_id(
            user_file_system_id=db_user.default_user_file_system
        )
        
        markdown_content = await get_markdown_content_by_section_id(
            section_id=section_id,
            user_id=user_id
        )
        
        if db_engine.uuid == EngineUUID.Volc_TTS.value:
            engine = VolcTTSEngine()
        else:
            raise Exception("Unsupport engine, uuid: " + db_engine.uuid)
        
        await engine.init_engine_config_by_user_engine_id(
            user_engine_id=db_user.default_podcast_user_engine_id
        )
        
        podcast_result = await engine.synthesize(
            text=markdown_content
        )
        audio_bytes = httpx.get(url=str(podcast_result)).content
        podcast_file_name = f"files/{uuid.uuid4().hex}.mp3"
        await remote_file_service.upload_raw_content_to_path(
            file_path=podcast_file_name, 
            content=audio_bytes,
            content_type="audio/mpeg"
        )

        db_podcast_task.status = SectionPodcastStatus.SUCCESS
        db_podcast_task.podcast_file_name = podcast_file_name
        db.commit()

    except Exception as e:
        exception_logger.error(f"Something is error while updating the ai podcast: {e}")
        db_podcast_task.status = SectionPodcastStatus.FAILED
        db.commit()
        raise e
    finally:
        db.close()

async def handle_start_section_process(
    section_id: int,
    user_id: int,
    auto_summary: bool = False,
    auto_podcast: bool = False,
    override: SectionOverrideProperty | None = None
):
    db = SessionLocal()
    db_section_process_task = crud.task.get_section_process_task_by_section_id(
        db=db,
        section_id=section_id
    )
    if db_section_process_task is None:
        db_section_process_task = crud.task.create_section_process_task(
            db=db,
            user_id=user_id,
            section_id=section_id,
            status=SectionProcessStatus.PROCESSING
        )
    db.commit()
    # TODO

async def handle_update_sections_for_document(
    section_ids: list[int], 
    document_id: int, 
    user_id: int
):
    db = SessionLocal()
    db_user = crud.user.get_user_by_id(
        db=db, 
        user_id=user_id
    )
    if db_user is None:
        raise Exception("The user who is about to update the his/her sections is not found")
    if db_user.default_user_file_system is None:
        raise Exception("The user who is about to update the his/her sections havn't set a default file system")
    if db_user.default_document_reader_model_id is None:
        raise Exception("The user who is about to update the his/her sections havn't set a default document reader model")
    db_document = crud.document.get_document_by_document_id(
        db=db,
        document_id=document_id
    )
    if db_document is None:
        raise Exception("The document which will be used to update the sections is not found.")
    
    remote_file_service = await get_user_remote_file_system(
        user_id=user_id
    )
    await remote_file_service.init_client_by_user_file_system_id(
        user_file_system_id=db_user.default_user_file_system
    )

    markdown_content = await get_markdown_content_by_document_id(
        document_id=document_id,
        user_id=user_id
    )
    for section_id in section_ids:
        try:
            db_section = crud.section.get_section_by_section_id(
                db=db,
                section_id=section_id
            )
            if db_section is None:
                raise Exception("The section which will be updated is not found.")
            db_user_section = crud.section.get_section_user_by_section_id_and_user_id(
                db=db,
                section_id=section_id,
                user_id=user_id
            )
            if db_user_section is None or db_user_section.authority == UserSectionAuthority.READ_ONLY:
                raise Exception("User does not have permission to modify this section")
            
            db_section_process_task = crud.task.get_section_process_task_by_section_id(
                db=db,
                section_id=section_id
            )
            if db_section_process_task is None:
                db_section_process_task = crud.task.create_section_process_task(
                    db=db,
                    user_id=user_id,
                    section_id=section_id,
                    status=SectionProcessStatus.PROCESSING
                )
            else:
                if db_section_process_task.status != SectionProcessStatus.PROCESSING:
                    db_section_process_task.status = SectionProcessStatus.PROCESSING
                    
            db_section_document = crud.section.create_or_update_section_document(
                db=db,
                section_id=section_id,
                document_id=document_id,
                status=SectionDocumentIntegration.SUPPLEMENTING
            )
            db.commit()

            # as the section may have no document binded, we need to check if it has documents
            if db_section.md_file_name is not None:
                # get the original section summary
                origin_section_content = await remote_file_service.get_file_content_by_file_path(
                    file_path=db_section.md_file_name
                )
                # TODO 优化专栏的文档生成 让文档更加专业一些 结合多agent 需要图文并茂 当前只有文字总结
                # generate the new summary using the document
                summary_res = summary_section_with_origin(
                    user_id=user_id,
                    model_id=db_user.default_document_reader_model_id,
                    origin_section_markdown_content=origin_section_content,
                    new_document_markdown_content=markdown_content
                )
                # put the new summary into the file system
                md_file_name = f"markdown/{uuid.uuid4().hex}.md"
                await remote_file_service.upload_raw_content_to_path(
                    file_path=md_file_name, 
                    content=summary_res.summary.encode('utf-8'),
                    content_type='text/plain'
                )
                # update the section content
                db_section.md_file_name = md_file_name
            else:
                # summary the section of the document
                # TODO 优化专栏的文档生成 让文档更加专业一些 结合多agent 需要图文并茂 当前只有文字总结
                summary_res = summary_section(
                    user_id=user_id, 
                    model_id=db_user.default_document_reader_model_id, 
                    markdown_content=markdown_content
                )
                # put the summary into the file system
                md_file_name = f"markdown/{uuid.uuid4().hex}.md"
                await remote_file_service.upload_raw_content_to_path(
                    file_path=md_file_name, 
                    content=summary_res.summary.encode('utf-8'),
                    content_type='text/plain'
                )
                # update the section content
                db_section.md_file_name = md_file_name
            # as we successfully update the section, we need to set the status of the section document to 2 
            db_section_document.status = SectionDocumentIntegration.SUCCESS
            db.commit()
            # podcast
            if db_section.auto_podcast:
                await handle_update_section_ai_podcast(
                    section_id=section_id, 
                    user_id=user_id
                )
            db_section_process_task.status = SectionProcessStatus.SUCCESS
            db.commit()
        except Exception as e:
            exception_logger.error(f"Something is error while updating the section: {e}")
            db_section_document.status = SectionDocumentIntegration.FAILED
            db.commit()
            raise e
    db.close()

@celery_app.task
def start_process_document(
    document_id: int,
    user_id: int,
    auto_summary: bool = False,
    auto_podcast: bool = False,
    override: DocumentOverrideProperty | None = None
):
    asyncio.run(
        handle_process_document(
            document_id=document_id, 
            user_id=user_id, 
            auto_summary=auto_summary, 
            auto_podcast=auto_podcast, 
            override=override
        )
    )

@celery_app.task
def start_process_section(
    section_id: int,
    user_id: int,
    auto_summary: bool = False,
    auto_podcast: bool = False,
    override: SectionOverrideProperty | None = None
):
    db = SessionLocal()
    asyncio.run(
        handle_start_section_process(
            section_id=section_id,
            user_id=user_id,
            auto_summary=auto_summary,
            auto_podcast=auto_podcast,
            override=override
        )
    )
    db.close()

@celery_app.task
def update_sections_for_document(
    document_id: int,
    user_id: int
):
    db = SessionLocal()
    sections = crud.section.get_sections_by_document_id(
        db=db, 
        document_id=document_id
    )
    section_ids = [section.id for section in sections]
    asyncio.run(
        handle_update_sections_for_document(
            section_ids=section_ids,
            document_id=document_id, 
            user_id=user_id
        )
    )
    db.close()
    
@celery_app.task
def start_process_document_podcast(
    document_id: int,
    user_id: int
):
    asyncio.run(
        handle_update_document_ai_podcast(
            document_id=document_id, 
            user_id=user_id
        )
    )
    
@celery_app.task
def update_document_process_status(
    document_id: int,
    status: int
):
    db = SessionLocal()
    db_document_process_task = crud.task.get_document_process_task_by_document_id(
        db=db,
        document_id=document_id
    )
    if db_document_process_task is not None:
        db_document_process_task.status = status
        db.commit()
    db.close()
    
@celery_app.task
def start_process_section_podcast(
    section_id: int,
    user_id: int
):
    asyncio.run(
        handle_update_section_ai_podcast(
            section_id=section_id, 
            user_id=user_id
        )
    )
    
@celery_app.task
def update_section_process_status(
    section_id: int,
    status: int
):
    db = SessionLocal()
    db_section_process_task = crud.task.get_section_process_task_by_section_id(
        db=db,
        section_id=section_id
    )
    if db_section_process_task is not None:
        db_section_process_task.status = status
        db.commit()
    db.close()