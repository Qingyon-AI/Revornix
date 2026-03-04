import asyncio
import re
import uuid
from typing import TypedDict

import crud
from langgraph.graph import StateGraph, END

from common.ai import make_section_markdown
from common.logger import exception_logger, info_logger
from data.custom_types.all import EntityInfo, RelationInfo
from data.neo4j.base import neo4j_driver
from data.sql.base import session_scope
from enums.section import SectionDocumentIntegration, SectionProcessStatus
from enums.document import DocumentAudioTranscribeStatus, DocumentCategory, DocumentMdConvertStatus
from base_implement.image_generate_engine_base import ImageGenerateEngineBase
from schemas.section import GeneratedImage, ImagePlan
from common.markdown_helpers import (
    get_markdown_content_by_document_id,
    get_markdown_content_by_section_id,
)
from protocol.remote_file_service import RemoteFileServiceProtocol
from workflow.section_podcast_workflow import run_section_podcast_workflow
from proxy.engine_proxy import EngineProxy
from proxy.file_system_proxy import FileSystemProxy
from workflow.timing import add_timed_node, ainvoke_with_timing, timed_stage


class SectionProcessState(TypedDict, total=False):
    section_id: int
    user_id: int
    auto_podcast: bool
    target_document_ids: list[int]
    skip_processing: bool
    section_md_file_name: str | None
    default_document_reader_model_id: int | None
    auto_illustration: bool
    default_image_generate_engine_id: int | None


WORKFLOW_NAME = "section_process"


ENTITY_QUERY = """
    MATCH (d:Document)
    WHERE d.creator_id = $user_id AND d.id IN $doc_ids
    MATCH (d)-[:HAS_CHUNK]->(c:Chunk)-[:MENTIONS]->(e:Entity)
    RETURN DISTINCT e.id AS id, e.text AS text, e.entity_type AS entity_type
"""

EDGE_QUERY = """
    MATCH (d:Document)
    WHERE d.creator_id = $user_id AND d.id IN $doc_ids
    MATCH (d)-[:HAS_CHUNK]->(c1:Chunk)-[:MENTIONS]->(e1:Entity)
    MATCH (d)-[:HAS_CHUNK]->(c2:Chunk)-[:MENTIONS]->(e2:Entity)
    MATCH (e1)-[r]->(e2)
    RETURN DISTINCT e1.id AS src_id, e2.id AS tgt_id, type(r) AS relation_type
"""

DOCUMENT_MARKDOWN_FETCH_CONCURRENCY = 6
IMAGE_GENERATE_CONCURRENCY = 2

def _get_document_ready_state(
    *,
    db,
    document_id: int,
) -> tuple[bool, str]:
    db_document = crud.document.get_document_by_document_id(
        db=db,
        document_id=document_id
    )
    if db_document is None:
        return False, "document_not_found"

    category = db_document.category
    if category == DocumentCategory.QUICK_NOTE:
        return True, "ready"

    if category in (DocumentCategory.WEBSITE, DocumentCategory.FILE):
        convert_task = crud.task.get_document_convert_task_by_document_id(
            db=db,
            document_id=document_id
        )
        if convert_task is None:
            return False, "convert_task_missing"
        if convert_task.status != DocumentMdConvertStatus.SUCCESS:
            return False, f"convert_status={convert_task.status}"
        if convert_task.md_file_name is None:
            return False, "convert_md_missing"
        return True, "ready"

    if category == DocumentCategory.AUDIO:
        transcribe_task = crud.task.get_document_audio_transcribe_task_by_document_id(
            db=db,
            document_id=document_id
        )
        if transcribe_task is None:
            return False, "transcribe_task_missing"
        if transcribe_task.status != DocumentAudioTranscribeStatus.SUCCESS:
            return False, f"transcribe_status={transcribe_task.status}"
        if transcribe_task.transcribed_text is None:
            return False, "transcribe_text_missing"
        return True, "ready"

    return False, f"unsupported_category={category}"


def apply_generated_images(
    markdown_with_markers: str,
    images: list[GeneratedImage],
) -> str:
    image_map = {img.id: img.image for img in images}
    used_ids: set[str] = set()

    def repl(match: re.Match) -> str:
        image_id = match.group(1).strip()

        if image_id in used_ids:
            return match.group(0)

        used_ids.add(image_id)

        image_md = image_map.get(image_id)
        if not image_md:
            exception_logger.warning(f"[SectionImage] missing image for id={image_id}")
            return match.group(0)

        return f"\n\n{image_md}\n\n"

    pattern = re.compile(r"\[image-id:\s*([^\]]+)\]")
    return pattern.sub(repl, markdown_with_markers)


async def _fetch_document_markdown(
    *,
    section_id: int,
    user_id: int,
    document_id: int,
    remote_file_service: RemoteFileServiceProtocol,
    semaphore: asyncio.Semaphore,
) -> tuple[int, str | None]:
    async with semaphore:
        try:
            markdown_content = await get_markdown_content_by_document_id(
                document_id=document_id,
                user_id=user_id,
                remote_file_service=remote_file_service,
            )
            return document_id, markdown_content
        except Exception as e:
            exception_logger.error(
                f"Section {section_id} failed to collect document {document_id}: {e}"
            )
            return document_id, None


async def _generate_section_image(
    *,
    section_id: int,
    engine: ImageGenerateEngineBase,
    image_plan: ImagePlan,
    semaphore: asyncio.Semaphore,
) -> GeneratedImage | None:
    async with semaphore:
        try:
            generated_image = await asyncio.to_thread(
                engine.generate_image,
                image_plan.prompt,
            )
        except Exception as image_error:
            exception_logger.error(
                f"[SectionImage] generate image failed: section={section_id}, "
                f"image_id={image_plan.id}, error={image_error}"
            )
            return None
        if generated_image is None:
            return None
        return GeneratedImage(
            id=image_plan.id,
            prompt=image_plan.prompt,
            image=generated_image,
        )


async def _load_context(
    state: SectionProcessState
) -> SectionProcessState:
    section_id = state.get("section_id")
    user_id = state.get("user_id")
    if section_id is None or user_id is None:
        raise Exception("Section workflow missing section_id or user_id")

    with session_scope() as db:
        db_section = crud.section.get_section_by_section_id(
            db=db,
            section_id=section_id
        )
        if db_section is None:
            raise Exception("The section which will be processed is not found.")
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

        state["section_md_file_name"] = db_section.md_file_name
        state["auto_illustration"] = db_section.auto_illustration
        state["default_document_reader_model_id"] = db_user.default_document_reader_model_id
        state["default_image_generate_engine_id"] = db_user.default_image_generate_engine_id

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

        target_documents = (
            db_section_documents_all
            if db_section.md_file_name is None
            else db_section_documents_wait_to
        )
        ready_documents = []
        pending_documents: list[tuple[int, str]] = []
        for section_document in target_documents:
            ready, reason = _get_document_ready_state(
                db=db,
                document_id=section_document.document_id
            )
            if ready:
                ready_documents.append(section_document)
            else:
                pending_documents.append((section_document.document_id, reason))

        if pending_documents:
            exception_logger.warning(
                f"Section {section_id} skipped pending documents: {pending_documents}"
            )

        if not ready_documents:
            if db_section_process_task is not None:
                db_section_process_task.status = SectionProcessStatus.WAIT_TO
            db.commit()
            state["target_document_ids"] = []
            state["skip_processing"] = True
            return state

        for section_document in ready_documents:
            section_document.status = SectionDocumentIntegration.SUPPLEMENTING
        db.commit()

        state["target_document_ids"] = [doc.document_id for doc in ready_documents]

    return state


async def _build_section_content(
    state: SectionProcessState
) -> SectionProcessState:
    if state.get("skip_processing"):
        return state
    section_id = state.get("section_id")
    user_id = state.get("user_id")
    model_id = state.get("default_document_reader_model_id")
    section_md_file_name = state.get("section_md_file_name")
    engine_id = state.get("default_image_generate_engine_id")
    target_document_ids = state.get("target_document_ids", [])
    if user_id is None or section_id is None or model_id is None:
        raise Exception("Section workflow missing user_id, section_id or model_id")

    markdown_contents: list[str] = []
    ok_document_ids: list[int] = []
    remote_file_service = await FileSystemProxy.create(
        user_id=user_id
    )

    current_markdown_content = None
    if section_md_file_name is not None:
        try:
            with timed_stage(
                workflow_name=WORKFLOW_NAME,
                node_name="build_section_content",
                stage_name="load_previous_markdown_context",
                context={
                    "section_id": section_id,
                    "user_id": user_id,
                },
            ):
                current_markdown_content = await get_markdown_content_by_section_id(
                    section_id=section_id,
                    user_id=user_id,
                    remote_file_service=remote_file_service,
                    allow_missing=True,
                )
        except Exception as e:
            exception_logger.warning(
                f"Section {section_id} failed to load previous markdown context: {e}"
            )

    fetch_semaphore = asyncio.Semaphore(DOCUMENT_MARKDOWN_FETCH_CONCURRENCY)
    fetch_tasks = [
        _fetch_document_markdown(
            section_id=section_id,
            user_id=user_id,
            document_id=document_id,
            remote_file_service=remote_file_service,
            semaphore=fetch_semaphore,
        )
        for document_id in target_document_ids
    ]
    with timed_stage(
        workflow_name=WORKFLOW_NAME,
        node_name="build_section_content",
        stage_name="fetch_target_markdowns",
        context={
            "section_id": section_id,
            "target_documents": len(target_document_ids),
        },
    ):
        fetch_results = await asyncio.gather(*fetch_tasks)
    failed_document_ids: list[int] = []
    for document_id, markdown_content in fetch_results:
        if markdown_content is None:
            failed_document_ids.append(document_id)
            continue
        markdown_contents.append(markdown_content)
        ok_document_ids.append(document_id)

    if failed_document_ids:
        with session_scope() as db:
            for document_id in failed_document_ids:
                try:
                    crud.section.update_section_document_by_section_id_and_document_id(
                        db=db,
                        section_id=section_id,
                        document_id=document_id,
                        status=SectionDocumentIntegration.FAILED
                    )
                except Exception as update_error:
                    exception_logger.error(
                        f"Failed to mark section document failed: section={section_id}, "
                        f"document={document_id}, error={update_error}"
                    )
            db.commit()

    if not markdown_contents:
        with session_scope() as db:
            db_section_process_task = crud.task.get_section_process_task_by_section_id(
                db=db,
                section_id=section_id
            )
            if db_section_process_task is not None:
                db_section_process_task.status = SectionProcessStatus.FAILED
            db.commit()
        state["skip_processing"] = True
        return state

    entities: list[EntityInfo] = []
    relations: list[RelationInfo] = []
    with timed_stage(
        workflow_name=WORKFLOW_NAME,
        node_name="build_section_content",
        stage_name="load_graph_entities_relations",
        context={
            "section_id": section_id,
            "ok_documents": len(ok_document_ids),
        },
    ):
        with neo4j_driver.session() as session:
            entities_result = session.run(
                ENTITY_QUERY,
                user_id=user_id,
                doc_ids=ok_document_ids
            )
            for record in entities_result:
                entities.append(
                    EntityInfo(
                        id=record["id"],
                        text=record["text"],
                        entity_type=record["entity_type"],
                        chunks=[]
                    )
                )
            relations_result = session.run(
                EDGE_QUERY,
                user_id=user_id,
                doc_ids=ok_document_ids
            )
            for record in relations_result:
                relations.append(
                    RelationInfo(
                        src_node=record["src_id"],
                        tgt_node=record["tgt_id"],
                        relation_type=record["relation_type"]
                    )
                )

    with timed_stage(
        workflow_name=WORKFLOW_NAME,
        node_name="build_section_content",
        stage_name="compose_section_markdown",
        context={
            "section_id": section_id,
            "entities": len(entities),
            "relations": len(relations),
        },
    ):
        content = await make_section_markdown(
            user_id=user_id,
            model_id=model_id,
            current_markdown_content=current_markdown_content,
            new_markdown_contents_to_append="\n".join(markdown_contents),
            entities=entities,
            relations=relations
        )

    if state.get("auto_illustration") and engine_id is not None:
        with timed_stage(
            workflow_name=WORKFLOW_NAME,
            node_name="build_section_content",
            stage_name="plan_section_images",
            context={"section_id": section_id},
        ):
            engine = await EngineProxy.create_image_generate_engine(
                user_id=user_id,
                engine_id=engine_id
            )
            images_plan = await ImageGenerateEngineBase.plan_images_with_llm(
                user_id=user_id,
                markdown=content,
                entities=entities,
                relations=relations,
            )
        if images_plan.plans:
            image_semaphore = asyncio.Semaphore(IMAGE_GENERATE_CONCURRENCY)
            with timed_stage(
                workflow_name=WORKFLOW_NAME,
                node_name="build_section_content",
                stage_name="generate_section_images",
                context={
                    "section_id": section_id,
                    "plan_count": len(images_plan.plans),
                },
            ):
                generated_images = [
                    image
                    for image in await asyncio.gather(
                        *[
                            _generate_section_image(
                                section_id=section_id,
                                engine=engine,
                                image_plan=plan,
                                semaphore=image_semaphore,
                            )
                            for plan in images_plan.plans
                        ]
                    )
                    if image is not None
                ]
            content = apply_generated_images(images_plan.markdown_with_markers, generated_images)

    md_file_name = f"markdown/{uuid.uuid4().hex}.md"
    with timed_stage(
        workflow_name=WORKFLOW_NAME,
        node_name="build_section_content",
        stage_name="upload_section_markdown",
        context={
            "section_id": section_id,
            "markdown_length": len(content),
        },
    ):
        await remote_file_service.upload_raw_content_to_path(
            file_path=md_file_name,
            content=content.encode("utf-8"),
            content_type="text/plain"
        )

    with timed_stage(
        workflow_name=WORKFLOW_NAME,
        node_name="build_section_content",
        stage_name="persist_section_result",
        context={
            "section_id": section_id,
            "ok_documents": len(ok_document_ids),
            "failed_documents": len(failed_document_ids),
        },
    ):
        with session_scope() as db:
            db_section = crud.section.get_section_by_section_id(
                db=db,
                section_id=section_id
            )
            if db_section is None:
                raise Exception("The section which will be processed is not found.")
            db_section.md_file_name = md_file_name

            db_section_process_task = crud.task.get_section_process_task_by_section_id(
                db=db,
                section_id=section_id
            )
            if db_section_process_task is not None:
                db_section_process_task.status = SectionProcessStatus.SUCCESS

            if ok_document_ids:
                ok_document_id_set = set(ok_document_ids)
                db_section_documents = crud.section.get_section_documents_by_section_id(
                    db=db,
                    section_id=section_id
                )
                for db_section_document in db_section_documents:
                    if db_section_document.document_id in ok_document_id_set:
                        db_section_document.status = SectionDocumentIntegration.SUCCESS

            db.commit()

    info_logger.info(
        f"[WorkflowTiming] stage_summary workflow={WORKFLOW_NAME}, node=build_section_content, "
        f"stage=section_content_summary, section_id={section_id}, "
        f"target_documents={len(target_document_ids)}, ok_documents={len(ok_document_ids)}, "
        f"failed_documents={len(failed_document_ids)}, entities={len(entities)}, "
        f"relations={len(relations)}"
    )

    return state


async def _maybe_podcast(
    state: SectionProcessState
) -> SectionProcessState:
    if state.get("skip_processing"):
        return state
    if state.get("auto_podcast"):
        section_id = state.get("section_id")
        user_id = state.get("user_id")
        if section_id is None or user_id is None:
            raise Exception("Section workflow missing section_id or user_id")
        await run_section_podcast_workflow(
            section_id=section_id,
            user_id=user_id
        )
    return state


def _build_workflow():
    workflow = StateGraph(SectionProcessState)
    add_timed_node(
        workflow,
        workflow_name=WORKFLOW_NAME,
        node_name="load_context",
        node_func=_load_context,
    )
    add_timed_node(
        workflow,
        workflow_name=WORKFLOW_NAME,
        node_name="build_section_content",
        node_func=_build_section_content,
    )
    add_timed_node(
        workflow,
        workflow_name=WORKFLOW_NAME,
        node_name="maybe_podcast",
        node_func=_maybe_podcast,
    )

    workflow.set_entry_point("load_context")
    workflow.add_edge("load_context", "build_section_content")
    workflow.add_edge("build_section_content", "maybe_podcast")
    workflow.add_edge("maybe_podcast", END)
    return workflow.compile()


_WORKFLOW = None


def get_section_process_workflow():
    global _WORKFLOW
    if _WORKFLOW is None:
        _WORKFLOW = _build_workflow()
    return _WORKFLOW


async def run_section_process_workflow(
    *,
    section_id: int,
    user_id: int,
    auto_podcast: bool = False,
) -> None:
    workflow = get_section_process_workflow()
    try:
        await ainvoke_with_timing(
            workflow_name=WORKFLOW_NAME,
            workflow=workflow,
            payload={
                "section_id": section_id,
                "user_id": user_id,
                "auto_podcast": auto_podcast
            },
        )
    except Exception as e:
        exception_logger.error(f"Error processing section {section_id}: {e}")
        try:
            with session_scope() as db:
                db_section_process_task = crud.task.get_section_process_task_by_section_id(
                    db=db,
                    section_id=section_id
                )
                if db_section_process_task is not None:
                    db_section_process_task.status = SectionProcessStatus.FAILED
                    db.commit()
        except Exception as inner_exception:
            exception_logger.error(f"Failed to update section process status: {inner_exception}")
        raise
