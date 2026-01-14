from dotenv import load_dotenv
load_dotenv(override=True)

import re
import uuid
import crud
import asyncio
from data.custom_types.all import EntityInfo, RelationInfo
from schemas.section import GeneratedImage
from data.neo4j.base import neo4j_driver
from data.common import stream_chunk_document
from notification.common import trigger_user_notification_event
from celery import Celery
from common.jwt_utils import create_token
from schemas.task import DocumentOverrideProperty, SectionOverrideProperty
from enums.document import DocumentProcessStatus
from config.redis import REDIS_PORT, REDIS_URL
from config.base import BASE_DIR
from common.logger import exception_logger
from common.ai import summary_content
from common.common import get_user_remote_file_system
from data.sql.base import SessionLocal
from common.ai import reducer_summary
from data.neo4j.insert import upsert_entities_neo4j, upsert_relations_neo4j, upsert_chunk_entity_relations, create_communities_from_chunks, create_community_nodes_and_relationships_with_size, annotate_node_degrees, upsert_chunks_neo4j, upsert_doc_chunk_relations, upsert_doc_neo4j
from data.milvus.insert import upsert_milvus
from data.common import extract_entities_relations, get_extract_llm_client
from data.custom_types.all import DocumentInfo
from engine.markdown.markitdown import MarkitdownEngine
from engine.markdown.jina import JinaEngine
from engine.markdown.mineru import MineruEngine
from engine.markdown.mineru_api import MineruApiEngine
from engine.tts.volc.tts import VolcTTSEngine
from engine.tts.openai import OpenAIAudioEngine
from engine.tts.volc.official_volc import OfficialVolcTTSEngine
from enums.engine import Engine
from common.ai import make_section_markdown
from enums.document import DocumentCategory, DocumentMdConvertStatus, DocumentEmbeddingStatus, DocumentPodcastStatus, DocumentGraphStatus, DocumentSummarizeStatus
from enums.section import SectionPodcastStatus, SectionDocumentIntegration, SectionProcessStatus
from proxy.ai_model_proxy import AIModelProxy
from engine.image.banana import BananaImageGenerateEngine
from engine.image.official_banana import OfficialBananaImageGenerateEngine
from engine.tag.llm_document import LLMDocumentTagEngine
from protocol.image_generate_engine import ImageGenerateEngineProtocol
from common.dependencies import check_deployed_by_official_in_fuc, plan_ability_checked_in_func
from enums.ability import Ability
from common.logger import exception_logger
from engine.embedding.factory import get_embedding_engine

celery_app = Celery('worker', broker=f'redis://{REDIS_URL}:{REDIS_PORT}/0', backend=f'redis://{REDIS_URL}:{REDIS_PORT}/0')

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
        )
    if db_podcast_task.status != DocumentPodcastStatus.GENERATING:
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
        
        if db_engine.uuid == Engine.Volc_TTS.meta.uuid:
            engine = VolcTTSEngine()
        elif db_engine.uuid == Engine.OpenAI_TTS.meta.uuid:
            engine = OpenAIAudioEngine()
        elif db_engine.uuid == Engine.Official_Volc_TTS.meta.uuid:
            engine = OfficialVolcTTSEngine()
        else:
            raise Exception("Unsupport engine, uuid: " + db_engine.uuid)
        
        await engine.init_engine_config_by_user_engine_id(
            user_engine_id=db_user.default_podcast_user_engine_id
        )
        
        audio_bytes = await engine.synthesize(
            text=markdown_content
        )
        if audio_bytes is None:
            db_podcast_task.status = DocumentPodcastStatus.FAILED
            db.commit()
            raise Exception("The podcast of the document is not generated because of the error of the engine")
        podcast_file_name = f"files/{uuid.uuid4().hex}.mp3"
        await remote_file_service.upload_raw_content_to_path(
            file_path=podcast_file_name, 
            content=audio_bytes,
            content_type="audio/mpeg"
        )
        
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

async def handle_update_document_ai_graph(
    document_id: int,
    user_id: int
):
    db = SessionLocal()
    db_document = crud.document.get_document_by_document_id(
        db=db,
        document_id=document_id
    )
    if db_document is None:
        raise Exception("The document which you want to summarize is not found")
    
    db_user = crud.user.get_user_by_id(
        db=db, 
        user_id=user_id
    )
    if db_user is None:
        raise Exception("The user which you want to summarize document is not found")
    if db_user.default_user_file_system is None:
        raise Exception("The user which you want to summarize document has not set default user file system")
    if db_user.default_document_reader_model_id is None:
        raise Exception("The user which you want to summarize document has not set default document reader model")
    
    access_token, _ = create_token(
        user=db_user
    )
    auth_status = await plan_ability_checked_in_func(
        ability=Ability.KNOWLEDGE_GRAPH.value,
        authorization=f'Bearer {access_token}'
    )
    deployed_by_official = check_deployed_by_official_in_fuc()
    if deployed_by_official and not auth_status:
        raise Exception("The user has not access to the knowledge graph ability")

    db_graph_task = crud.task.get_document_graph_task_by_document_id(
        db=db,
        document_id=document_id
    )
    if db_graph_task is None:
        db_graph_task = crud.task.create_document_graph_task(
            db=db,
            user_id=user_id,
            document_id=document_id,
        )
    if db_graph_task.status != DocumentGraphStatus.BUILDING:
        db_graph_task.status = DocumentGraphStatus.BUILDING
    db.commit()

    try:
        model_configuration = (await AIModelProxy.create(
            user_id=user_id,
            model_id=db_user.default_document_reader_model_id
        )).get_configuration()
        
        llm_client = await get_extract_llm_client(
            user_id=user_id
        )
        entities = []
        relations = []
        async for chunk_info in stream_chunk_document(doc_id=document_id):
            sub_entities, sub_relations = extract_entities_relations(
                user_id=user_id,
                llm_client=llm_client, 
                llm_model=model_configuration.model_name,
                chunk=chunk_info
            )
            entities.extend(sub_entities)
            relations.extend(sub_relations)
            upsert_chunks_neo4j(
                chunks_info=[chunk_info]
            )
    
        upsert_doc_neo4j(
            docs_info=[
                DocumentInfo(
                    id=db_document.id,
                    title=db_document.title,
                    description=db_document.description,
                    creator_id=db_document.creator_id,
                    update_time=db_document.update_time,
                    create_time=db_document.create_time
                )
            ]
        )
        upsert_doc_chunk_relations()
        upsert_entities_neo4j(entities)
        upsert_relations_neo4j(relations)
        upsert_chunk_entity_relations()
        create_communities_from_chunks()
        create_community_nodes_and_relationships_with_size()
        annotate_node_degrees()
        db_graph_task.status = DocumentGraphStatus.SUCCESS.value
        db.commit()
    except Exception as e:
        exception_logger.error(f"Something is error while graphing document info: {e}")
        db_graph_task.status = DocumentGraphStatus.FAILED.value
        db.commit()
        raise e
    finally:
        db.close()


async def handle_update_document_ai_summarize(
    document_id: int, 
    user_id: int
):
    db = SessionLocal()
    db_document = crud.document.get_document_by_document_id(
        db=db,
        document_id=document_id
    )
    if db_document is None:
        raise Exception("The document which you want to summarize is not found")
    
    db_user = crud.user.get_user_by_id(
        db=db, 
        user_id=user_id
    )
    if db_user is None:
        raise Exception("The user which you want to summarize document is not found")
    if db_user.default_user_file_system is None:
        raise Exception("The user which you want to summarize document has not set default user file system")
    if db_user.default_document_reader_model_id is None:
        raise Exception("The user which you want to summarize document has not set default document reader model")
    
    db_summarize_task = crud.task.get_document_summarize_task_by_document_id(
        db=db,
        document_id=document_id
    )
    if db_summarize_task is None:
        db_summarize_task = crud.task.create_document_summarize_task(
            db=db,
            user_id=user_id,
            document_id=document_id,
        )
    if db_summarize_task.status != DocumentSummarizeStatus.SUMMARIZING:
        db_summarize_task.status = DocumentSummarizeStatus.SUMMARIZING
    db.commit()
    
    try:
        model_configuration = (await AIModelProxy.create(
            user_id=user_id,
            model_id=db_user.default_document_reader_model_id
        )).get_configuration()
        
        llm_client = await get_extract_llm_client(
            user_id=user_id
        )
        entities = []
        relations = []
        
        final_summary = None

        async for chunk_info in stream_chunk_document(doc_id=document_id):
            sub_entities, sub_relations = extract_entities_relations(
                user_id=user_id,
                llm_client=llm_client, 
                llm_model=model_configuration.model_name,
                chunk=chunk_info
            )
            entities.extend(sub_entities)
            relations.extend(sub_relations)
            # map summary
            chunk_info.summary = (await summary_content(
                user_id=user_id, 
                model_id=db_user.default_document_reader_model_id, 
                content=chunk_info.text
            )).summary
            final_summary = (await reducer_summary(
                user_id=user_id,
                model_id=db_user.default_document_reader_model_id,
                current_summary=final_summary, 
                new_summary_to_append=chunk_info.summary,
                new_entities=sub_entities,
                new_relations=sub_relations
            )).summary
            db_summarize_task.summary = final_summary
            db_summarize_task.status = DocumentSummarizeStatus.SUCCESS
        db.commit()
    except Exception as e:
        exception_logger.error(f"Something is error while updating the ai summary: {e}")
        db_summarize_task.status = DocumentSummarizeStatus.FAILED
        db.commit()
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
        db_document = crud.document.get_document_by_document_id(
            db=db,
            document_id=document_id
        )
        if db_document is None:
            raise Exception("The document you want to process is not found")
        if db_document.category == DocumentCategory.QUICK_NOTE:
            # 目前的设计架构 速记模式在api请求时候已经填充了数据，后台任务不需要convert处理 直接设为成功然后退出该进程即可
            db_convert_task.status = DocumentMdConvertStatus.SUCCESS
            db.commit()
            return
        if db_document.category == DocumentCategory.FILE:
            if db_user.default_file_document_parse_user_engine_id is None:
                raise Exception("The user which you want to process document has not set default file document parse user engine")
            md_extractor = crud.engine.get_user_engine_by_user_engine_id(
                db=db, 
                user_engine_id=db_user.default_file_document_parse_user_engine_id
            )
        elif db_document.category == DocumentCategory.WEBSITE:
            if db_user.default_website_document_parse_user_engine_id is None:
                raise Exception("The user which you want to process document has not set default website document parse user engine")
            md_extractor = crud.engine.get_user_engine_by_user_engine_id(
                db=db, 
                user_engine_id=db_user.default_website_document_parse_user_engine_id
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
        
        if db_engine.uuid == Engine.MinerU_API.meta.uuid:
            engine = MineruApiEngine()
        elif db_engine.uuid == Engine.MarkitDown.meta.uuid:
            engine = MarkitdownEngine()
        elif db_engine.uuid == Engine.Jina.meta.uuid:
            engine = JinaEngine()
        elif db_engine.uuid == Engine.MinerU.meta.uuid:
            engine = MineruEngine()
        else:
            raise Exception("The convert engine is not supported")
        
        if db_document.category == DocumentCategory.FILE:
            if db_user.default_file_document_parse_user_engine_id is None:
                raise Exception("The user who want to process document has not set default file document parse user engine")
            await engine.init_engine_config_by_user_engine_id(
                user_engine_id=db_user.default_file_document_parse_user_engine_id
            )
        elif db_document.category == DocumentCategory.WEBSITE:
            if db_user.default_website_document_parse_user_engine_id is None:
                raise Exception("The user who want to process document has not set default website document parse user engine")
            await engine.init_engine_config_by_user_engine_id(
                user_engine_id=db_user.default_website_document_parse_user_engine_id
            )
        
        md_file_name = None
        
        if db_document.category == DocumentCategory.FILE:
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


async def handle_tag_document(
    document_id: int,
    user_id: int
):
    db = SessionLocal()
    try:
        tag_engine = LLMDocumentTagEngine(user_id=user_id)
        tags = await tag_engine.generate_tags(
            document_id=document_id
        )
        if tags is None:
            return
        tag_ids = [
            tag.id for tag in tags
        ]
        crud.document.create_document_labels(
            db=db,
            document_id=document_id,
            label_ids=tag_ids
        )
        db.commit()
    except Exception as e:
        exception_logger.error(f"Something is error while tagging the document: {e}")
        raise e
    finally:
        db.close()

async def handle_process_document(
    document_id: int, 
    user_id: int,
    auto_tag: bool = False,
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
        if db_user.default_document_reader_model_id is None:
            raise Exception("The user which you want to process document has not set default document reader model")
        model_configuration = (await AIModelProxy.create(
            user_id=user_id,
            model_id=db_user.default_document_reader_model_id
        )).get_configuration()
        db_document = crud.document.get_document_by_document_id(
            db=db,
            document_id=document_id
        )
        if db_document is None:
            raise Exception("The document you want to process is not found")

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
        
        if auto_tag:
            await handle_tag_document(
                document_id=document_id,
                user_id=user_id
            )
            
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
        if db_embedding_task.status != DocumentEmbeddingStatus.EMBEDDING:
            db_embedding_task.status = DocumentEmbeddingStatus.EMBEDDING
        
        if auto_summary:
            db_summarize_task = crud.task.get_document_summarize_task_by_document_id(
                db=db,
                document_id=document_id
            )
            if db_summarize_task is None:
                db_summarize_task = crud.task.create_document_summarize_task(
                    db=db,
                    user_id=user_id,
                    document_id=document_id,
                )
            if db_summarize_task.status != DocumentSummarizeStatus.SUMMARIZING:
                db_summarize_task.status = DocumentSummarizeStatus.SUMMARIZING

        db.commit()

        llm_client = await get_extract_llm_client(
            user_id=user_id
        )
        entities = []
        relations = []
        
        final_summary = None
        # chunking & embedding
        try:
            async for chunk_info in stream_chunk_document(doc_id=document_id):
                deployed_by_official = check_deployed_by_official_in_fuc()
                embedding_engine = get_embedding_engine()
                embedding = embedding_engine.embed([chunk_info.text])[0]
                chunk_info.embedding = embedding.tolist()
                sub_entities, sub_relations = extract_entities_relations(
                    user_id=user_id,
                    llm_client=llm_client, 
                    llm_model=model_configuration.model_name,
                    chunk=chunk_info
                )
                entities.extend(sub_entities)
                relations.extend(sub_relations)
                # map summary
                chunk_info.summary = (await summary_content(
                    user_id=user_id, 
                    model_id=db_user.default_document_reader_model_id, 
                    content=chunk_info.text
                )).summary
                if auto_summary:
                    final_summary = (await reducer_summary(
                        user_id=user_id,
                        model_id=db_user.default_document_reader_model_id,
                        current_summary=final_summary, 
                        new_summary_to_append=chunk_info.summary,
                        new_entities=sub_entities,
                        new_relations=sub_relations
                    )).summary
                upsert_milvus(
                    user_id=user_id,
                    chunks_info=[chunk_info]
                )
                upsert_chunks_neo4j(
                    chunks_info=[chunk_info]
                )
            db_embedding_task.status = DocumentEmbeddingStatus.SUCCESS
            if auto_summary:
                db_summarize_task.summary = final_summary
                db_summarize_task.status = DocumentSummarizeStatus.SUCCESS
        except Exception as e:
            exception_logger.error(f"Something is error while embedding document info: {e}")
            db_embedding_task.status = DocumentEmbeddingStatus.FAILED
            db_summarize_task.status = DocumentSummarizeStatus.FAILED
            raise e
        finally:
            db.commit()
        
        # graphing
        db_graph_task = crud.task.get_document_graph_task_by_document_id(
            db=db,
            document_id=document_id
        )
        if db_graph_task is None:
            db_graph_task = crud.task.create_document_graph_task(
                db=db,
                user_id=user_id,
                document_id=document_id
            )
        if db_graph_task.status != DocumentGraphStatus.BUILDING:
            db_graph_task.status = DocumentGraphStatus.BUILDING
        db.commit()
        access_token, _ = create_token(
            user=db_user
        )
        auth_status = await plan_ability_checked_in_func(
            ability=Ability.KNOWLEDGE_GRAPH.value,
            authorization=f'Bearer {access_token}'
        )
        deployed_by_official = check_deployed_by_official_in_fuc()
        if (deployed_by_official and auth_status) or (not deployed_by_official):
            upsert_doc_neo4j(
                docs_info=[
                    DocumentInfo(
                        id=db_document.id,
                        title=db_document.title,
                        description=db_document.description,
                        creator_id=db_document.creator_id,
                        update_time=db_document.update_time,
                        create_time=db_document.create_time
                    )
                ]
            )
            try:
                db_graph_task.status = DocumentGraphStatus.BUILDING.value
                db.commit()
                upsert_doc_chunk_relations()
                upsert_entities_neo4j(entities)
                upsert_relations_neo4j(relations)
                upsert_chunk_entity_relations()
                create_communities_from_chunks()
                create_community_nodes_and_relationships_with_size()
                annotate_node_degrees()
                db_graph_task.status = DocumentGraphStatus.SUCCESS.value
                db.commit()
            except Exception as e:
                exception_logger.error(f"Something is error while graphing document info: {e}")
                db_graph_task.status = DocumentGraphStatus.FAILED.value
                db.commit()
                raise e
        else:
            db_graph_task.status = DocumentGraphStatus.FAILED.value
            db.commit()
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
        
        if db_engine.uuid == Engine.Volc_TTS.meta.uuid:
            engine = VolcTTSEngine()
        elif db_engine.uuid == Engine.OpenAI_TTS.meta.uuid:
            engine = OpenAIAudioEngine()
        elif db_engine.uuid == Engine.Official_Volc_TTS.meta.uuid:
            engine = OfficialVolcTTSEngine()
        else:
            raise Exception("Unsupport engine, uuid: " + db_engine.uuid)
        
        await engine.init_engine_config_by_user_engine_id(
            user_engine_id=db_user.default_podcast_user_engine_id
        )
        
        audio_bytes = await engine.synthesize(
            text=markdown_content
        )
        if audio_bytes is None:
            db_podcast_task.status = SectionPodcastStatus.FAILED
            db.commit()
            raise Exception("The podcast of the section is not generated because of the error of the engine")
        
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

def apply_generated_images(
    markdown_with_markers: str,
    images: list[GeneratedImage],
) -> str:
    image_map = {img.id: img.image for img in images}
    used_ids: set[str] = set()

    def repl(match: re.Match) -> str:
        image_id = match.group(1).strip()

        if image_id in used_ids:
            # 重复使用，直接保留占位符，方便排查
            return match.group(0)

        used_ids.add(image_id)

        image_md = image_map.get(image_id)
        if not image_md:
            # 图片生成失败或缺失
            exception_logger.warning(f"[SectionImage] missing image for id={image_id}")
            return match.group(0)

        # 确保图片独立成块
        return f"\n\n{image_md}\n\n"

    pattern = re.compile(r"\[image-id:\s*([^\]]+)\]")
    return pattern.sub(repl, markdown_with_markers)

async def handle_process_section(
    section_id: int,
    user_id: int,
    auto_podcast: bool = False,
    override: SectionOverrideProperty | None = None
):
    db = SessionLocal()
    db_user = crud.user.get_user_by_id(
        db=db, 
        user_id=user_id
    )
    if db_user is None:
        raise Exception("The user who want to process section is not found")
    if db_user.default_document_reader_model_id is None:
        raise Exception("The user who want to process section has not set default document reader model")
    if db_user.default_user_file_system is None:
        raise Exception("The user who want to process section has not set default user file system")
    db_section = crud.section.get_section_by_section_id(
        db=db,
        section_id=section_id
    )
    if db_section is None:
        raise Exception("The section which will be processed is not found.")
    
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
    db_section_documents_all = crud.section.get_section_documents_by_section_id(
        db=db,
        section_id=section_id,
    )
    db_section_documents_wait_to = crud.section.get_section_documents_by_section_id(
        db=db,
        section_id=section_id,
        filter_status=SectionDocumentIntegration.WAIT_TO
    )
    markdown_contents = []
    entities = []
    relations = []
    entity_query = """
        MATCH (d:Document)
        WHERE d.creator_id = $user_id
        MATCH (d)-[:HAS_CHUNK]->(c:Chunk)-[:MENTIONS]->(e:Entity)
        RETURN DISTINCT e.id AS id, e.text AS text, e.entity_type AS entity_type
    """
    edge_query = """
        MATCH (d:Document)
        WHERE d.creator_id = $user_id
        MATCH (d)-[:HAS_CHUNK]->(c1:Chunk)-[:MENTIONS]->(e1:Entity)
        MATCH (d)-[:HAS_CHUNK]->(c2:Chunk)-[:MENTIONS]->(e2:Entity)
        MATCH (e1)-[r]->(e2)
        RETURN DISTINCT e1.id AS src_id, e2.id AS tgt_id, type(r) AS relation_type
    """
    if db_section.md_file_name is None:
        # 基于当前所有的专栏生成总结 新的md
        for section_document in db_section_documents_all:
            section_document.status = SectionDocumentIntegration.SUPPLEMENTING
            markdown_content = await get_markdown_content_by_document_id(
                document_id=section_document.document_id,
                user_id=user_id
            )
            markdown_contents.append(markdown_content)
            with neo4j_driver.session() as session:
                entities_result = session.run(entity_query, user_id=user_id)
                for record in entities_result:
                    entities.append(
                        EntityInfo(
                            id=record["id"],
                            text=record["text"],
                            entity_type=record["entity_type"],
                            chunks=[]
                        )
                    )
                relations_result = session.run(edge_query, user_id=user_id)
                for record in relations_result:
                    relations.append(
                        RelationInfo(
                            src_node=record["src_id"],
                            tgt_node=record["tgt_id"],
                            relation_type=record["relation_type"]
                        )
                    )
    else:
        # 基于当前没有被整合进专栏的文档和现有的专栏md 生成新的md
        for section_document in db_section_documents_wait_to:
            section_document.status = SectionDocumentIntegration.SUPPLEMENTING
            markdown_content = await get_markdown_content_by_document_id(
                document_id=section_document.document_id,
                user_id=user_id
            )
            markdown_contents.append(markdown_content)
            with neo4j_driver.session() as session:
                entities_result = session.run(entity_query, user_id=user_id)
                relations_result = session.run(edge_query, user_id=user_id)
                for record in entities_result:
                    entities.append(
                        EntityInfo(
                            id=record["id"],
                            text=record["text"],
                            entity_type=record["entity_type"],
                            chunks=[]
                        )
                    )
                relations_result = session.run(edge_query, user_id=user_id)
                for record in relations_result:
                    relations.append(
                        RelationInfo(
                            src_node=record["src_id"],
                            tgt_node=record["tgt_id"],
                            relation_type=record["relation_type"]
                        )
                    )
    content = await make_section_markdown(
        user_id=user_id,
        model_id=db_user.default_document_reader_model_id,
        current_markdown_content=db_section.md_file_name,
        new_markdown_contents_to_append="\n".join(markdown_contents),
        entities=entities,
        relations=relations
    )
    
    if db_section.auto_illustration and db_user.default_image_generate_engine_id is not None:
        # 如果用户设置了图像生成引擎，那么基于专栏当前的markdown生成插图
        db_image_generator = crud.engine.get_user_engine_by_user_engine_id(
            db=db, 
            user_engine_id=db_user.default_image_generate_engine_id
        )
        if db_image_generator is None:
            raise Exception("There is something wrong with the user's default image generate engine")
        db_engine = crud.engine.get_engine_by_id(
            db=db, 
            id=db_image_generator.engine_id
        )
        if db_engine is None:
            raise Exception("There is something wrong with the user's default image generate engine")
        if db_engine.uuid == Engine.Banana_Image.meta.uuid:
            engine = BananaImageGenerateEngine()
        elif db_engine.uuid == Engine.Official_Banana_Image.meta.uuid:
            engine = OfficialBananaImageGenerateEngine()
        else:
            raise Exception("Unsupport engine, uuid: " + db_engine.uuid)
        
        await engine.init_engine_config_by_user_engine_id(
            user_engine_id=db_user.default_image_generate_engine_id
        )
        
        # plan images + inject markers
        images_plan = await ImageGenerateEngineProtocol.plan_images_with_llm(
            user_id=user_id,
            markdown=content,
            entities=entities,
            relations=relations,
        )
        # generate images if needed
        if images_plan.plans:
            generated_images = []
            for plan in images_plan.plans:
                generated_image = engine.generate_image(
                    text=plan.prompt,
                )
                if generated_image is None:
                    continue
                generated_images.append(
                    GeneratedImage(
                        id=plan.id,
                        prompt=plan.prompt,
                        image=generated_image
                    )
                )
            content = apply_generated_images(images_plan.markdown_with_markers, generated_images)

    remote_file_service = await get_user_remote_file_system(
        user_id=user_id
    )
    await remote_file_service.init_client_by_user_file_system_id(
        user_file_system_id=db_user.default_user_file_system
    )
    # put the new summary into the file system
    md_file_name = f"markdown/{uuid.uuid4().hex}.md"
    await remote_file_service.upload_raw_content_to_path(
        file_path=md_file_name, 
        content=content.encode('utf-8'),
        content_type='text/plain'
    )
    # update the section content
    db_section.md_file_name = md_file_name
    db_section_process_task.status = SectionProcessStatus.SUCCESS
    db.commit()
    if override is not None:
        if override.title is not None:
            db_section.title = override.title
        if override.description is not None:
            db_section.description = override.description
        if override.cover is not None:
            db_section.cover = override.cover
    if db_section.md_file_name is None:
        for db_section_document in db_section_documents_all:
            db_section_document.status = SectionDocumentIntegration.SUCCESS
    else:
        for db_section_document in db_section_documents_wait_to:
            db_section_document.status = SectionDocumentIntegration.SUCCESS
    db.commit()
    if auto_podcast:
        await handle_update_section_ai_podcast(
            section_id=section_id, 
            user_id=user_id
        )

@celery_app.task
def start_process_document(
    document_id: int,
    user_id: int,
    auto_summary: bool = False,
    auto_podcast: bool = False,
    auto_tag: bool = False,
    override: DocumentOverrideProperty | None = None
):
    asyncio.run(
        handle_process_document(
            document_id=document_id, 
            user_id=user_id, 
            auto_summary=auto_summary, 
            auto_podcast=auto_podcast, 
            auto_tag=auto_tag,
            override=override
        )
    )

@celery_app.task
def start_process_section(
    section_id: int,
    user_id: int,
    auto_podcast: bool = False,
    override: SectionOverrideProperty | None = None
):
    db = SessionLocal()
    asyncio.run(
        handle_process_section(
            section_id=section_id,
            user_id=user_id,
            auto_podcast=auto_podcast,
            override=override
        )
    )
    db.close()
    
@celery_app.task
def start_process_document_graph(
    document_id: int,
    user_id: int
):
    asyncio.run(
        handle_update_document_ai_graph(
            document_id=document_id, 
            user_id=user_id
        )
    )

@celery_app.task
def start_process_document_summarize(
    document_id: int,
    user_id: int
):
    asyncio.run(
        handle_update_document_ai_summarize(
            document_id=document_id, 
            user_id=user_id
        )
    )

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

@celery_app.task
def start_trigger_user_notification_event(
    user_id: int,
    trigger_event_uuid: str,
    params: dict | None = None
):
    asyncio.run(
        trigger_user_notification_event(
            user_id=user_id,
            trigger_event_uuid=trigger_event_uuid,
            params=params
        )
    )
    
if __name__ == '__main__':
    asyncio.run(handle_process_section(
        section_id=1,
        user_id=1,
        auto_podcast=True,
        override=None
    ))