import uuid
from typing import TypedDict, cast

import crud
from langgraph.graph import StateGraph, END

from common.ai import reducer_summary, summary_content
from common.common import get_user_remote_file_system
from common.dependencies import check_deployed_by_official_in_fuc, plan_ability_checked_in_func
from common.jwt_utils import create_token
from common.logger import exception_logger
from config.base import BASE_DIR
from data.common import extract_entities_relations, get_extract_llm_client, stream_chunk_document
from data.custom_types.all import DocumentInfo, EntityInfo, RelationInfo
from data.milvus.insert import upsert_milvus
from data.neo4j.insert import (
    annotate_node_degrees,
    create_communities_from_chunks,
    create_community_nodes_and_relationships_with_size,
    upsert_chunk_entity_relations,
    upsert_chunks_neo4j,
    upsert_doc_chunk_relations,
    upsert_doc_neo4j,
    upsert_entities_neo4j,
    upsert_relations_neo4j,
)
from data.sql.base import SessionLocal
from engine.embedding.factory import get_embedding_engine
from engine.markdown.jina import JinaEngine
from engine.markdown.markitdown import MarkitdownEngine
from engine.markdown.mineru import MineruEngine
from engine.markdown.mineru_api import MineruApiEngine
from engine.tag.llm_document import LLMDocumentTagEngine
from enums.ability import Ability
from enums.document import (
    DocumentCategory,
    DocumentEmbeddingStatus,
    DocumentGraphStatus,
    DocumentMdConvertStatus,
    DocumentProcessStatus,
    DocumentSummarizeStatus,
)
from enums.engine import Engine
from proxy.ai_model_proxy import AIModelProxy
from schemas.task import DocumentOverrideProperty
from proxy.engine_proxy import EngineProxy


class DocumentProcessState(TypedDict, total=False):
    document_id: int
    user_id: int
    auto_summary: bool
    auto_podcast: bool
    auto_tag: bool
    override: dict | DocumentOverrideProperty | None


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
            # 速记模式在 api 请求时已填充数据，后台不需要 convert
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
        db_engine = crud.engine.get_engine_by_engine_id(
            db=db,
            engine_id=md_extractor.engine_id
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

        engine_config = None
        if db_document.category == DocumentCategory.FILE:
            if db_user.default_file_document_parse_user_engine_id is None:
                raise Exception("The user who want to process document has not set default file document parse user engine")
            engine_config = (await EngineProxy.create(
                user_id=user_id,
                engine_id=db_user.default_file_document_parse_user_engine_id
            )).get_configuration()
        elif db_document.category == DocumentCategory.WEBSITE:
            if db_user.default_website_document_parse_user_engine_id is None:
                raise Exception("The user who want to process document has not set default website document parse user engine")
            engine_config = (await EngineProxy.create(
                user_id=user_id,
                engine_id=db_user.default_website_document_parse_user_engine_id
            )).get_configuration()
        if engine_config:
            engine.set_engine_config(engine_config=engine_config)

        md_file_name = None

        if db_document.category == DocumentCategory.FILE:
            db_file_document = crud.document.get_file_document_by_document_id(
                db=db,
                document_id=document_id
            )
            if db_file_document is None:
                raise Exception("The document you want to process do not have a the file info")

            file_content = await remote_file_service.get_file_content_by_file_path(
                file_path=db_file_document.file_name
            )
            temp_file_path = f"{str(BASE_DIR)}/temp/{db_file_document.file_name.replace('files/', '')}"
            with open(temp_file_path, "wb") as f:
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
                content_type="text/plain"
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
        db_document.title = "Document Convert Error"
        db_document.description = f"Document Convert Error: {e}"
        db.commit()
        raise
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
        raise
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
        entities: list[EntityInfo] = []
        relations: list[RelationInfo] = []

        final_summary = None
        try:
            async for chunk_info in stream_chunk_document(doc_id=document_id):
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
            if auto_summary:
                db_summarize_task.status = DocumentSummarizeStatus.FAILED
            raise
        finally:
            db.commit()

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
            authorization=f"Bearer {access_token}"
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
                raise
        else:
            db_graph_task.status = DocumentGraphStatus.FAILED.value
            db.commit()

        if auto_podcast:
            from workflow.document_podcast_workflow import handle_update_document_ai_podcast

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
        raise
    finally:
        db.close()


async def _process_document(state: DocumentProcessState) -> DocumentProcessState:
    document_id = state.get("document_id")
    user_id = state.get("user_id")
    if document_id is None or user_id is None:
        raise Exception("Document workflow missing document_id or user_id")
    document_id = cast(int, document_id)
    user_id = cast(int, user_id)

    auto_summary = bool(state.get("auto_summary", False))
    auto_podcast = bool(state.get("auto_podcast", False))
    auto_tag = bool(state.get("auto_tag", False))

    override_obj = None
    raw_override = state.get("override")
    if raw_override is not None:
        if isinstance(raw_override, DocumentOverrideProperty):
            override_obj = raw_override
        else:
            override_obj = DocumentOverrideProperty.model_validate(raw_override)

    await handle_process_document(
        document_id=document_id,
        user_id=user_id,
        auto_summary=auto_summary,
        auto_podcast=auto_podcast,
        auto_tag=auto_tag,
        override=override_obj
    )
    return state


def _build_workflow():
    workflow = StateGraph(DocumentProcessState)
    workflow.add_node("process_document", _process_document)
    workflow.set_entry_point("process_document")
    workflow.add_edge("process_document", END)
    return workflow.compile()


_WORKFLOW = None


def get_document_process_workflow():
    global _WORKFLOW
    if _WORKFLOW is None:
        _WORKFLOW = _build_workflow()
    return _WORKFLOW


async def run_document_process_workflow(
    *,
    document_id: int,
    user_id: int,
    auto_summary: bool = False,
    auto_podcast: bool = False,
    auto_tag: bool = False,
    override: dict | None = None
) -> None:
    workflow = get_document_process_workflow()
    await workflow.ainvoke(
        {
            "document_id": document_id,
            "user_id": user_id,
            "auto_summary": auto_summary,
            "auto_podcast": auto_podcast,
            "auto_tag": auto_tag,
            "override": override,
        }
    )
