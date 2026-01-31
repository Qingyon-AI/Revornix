import re
import uuid
from typing import TypedDict

import crud
from langgraph.graph import StateGraph, END

from common.ai import make_section_markdown
from common.logger import exception_logger
from data.custom_types.all import EntityInfo, RelationInfo
from data.neo4j.base import neo4j_driver
from data.sql.base import session_scope
from enums.section import SectionDocumentIntegration, SectionProcessStatus
from base_implement.image_generate_engine_base import ImageGenerateEngineBase
from schemas.section import GeneratedImage
from common.markdown_helpers import get_markdown_content_by_document_id
from workflow.section_podcast_workflow import handle_update_section_ai_podcast
from proxy.engine_proxy import EngineProxy
from proxy.file_system_proxy import FileSystemProxy


class SectionProcessState(TypedDict, total=False):
    section_id: int
    user_id: int
    auto_podcast: bool
    target_document_ids: list[int]
    section_md_file_name: str | None
    default_document_reader_model_id: int | None
    auto_illustration: bool
    default_image_generate_engine_id: int | None
    markdown_blob: str
    entities: list[EntityInfo]
    relations: list[RelationInfo]
    content: str
    md_file_name: str


ENTITY_QUERY = """
    MATCH (d:Document)
    WHERE d.creator_id = $user_id
    MATCH (d)-[:HAS_CHUNK]->(c:Chunk)-[:MENTIONS]->(e:Entity)
    RETURN DISTINCT e.id AS id, e.text AS text, e.entity_type AS entity_type
"""

EDGE_QUERY = """
    MATCH (d:Document)
    WHERE d.creator_id = $user_id
    MATCH (d)-[:HAS_CHUNK]->(c1:Chunk)-[:MENTIONS]->(e1:Entity)
    MATCH (d)-[:HAS_CHUNK]->(c2:Chunk)-[:MENTIONS]->(e2:Entity)
    MATCH (e1)-[r]->(e2)
    RETURN DISTINCT e1.id AS src_id, e2.id AS tgt_id, type(r) AS relation_type
"""


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

        return f"\\n\\n{image_md}\\n\\n"

    pattern = re.compile(r"\[image-id:\s*([^\]]+)\]")
    return pattern.sub(repl, markdown_with_markers)


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
        for section_document in target_documents:
            section_document.status = SectionDocumentIntegration.SUPPLEMENTING
        db.commit()

        state["target_document_ids"] = [doc.document_id for doc in target_documents]

    return state


async def _collect_markdown_and_entities(
    state: SectionProcessState
) -> SectionProcessState:
    user_id = state.get("user_id")
    target_document_ids = state.get("target_document_ids", [])
    if user_id is None:
        raise Exception("Section workflow missing user_id")

    markdown_contents: list[str] = []
    entities: list[EntityInfo] = []
    relations: list[RelationInfo] = []

    for document_id in target_document_ids:
        markdown_content = await get_markdown_content_by_document_id(
            document_id=document_id,
            user_id=user_id
        )
        markdown_contents.append(markdown_content)
        with neo4j_driver.session() as session:
            entities_result = session.run(ENTITY_QUERY, user_id=user_id)
            for record in entities_result:
                entities.append(
                    EntityInfo(
                        id=record["id"],
                        text=record["text"],
                        entity_type=record["entity_type"],
                        chunks=[]
                    )
                )
            relations_result = session.run(EDGE_QUERY, user_id=user_id)
            for record in relations_result:
                relations.append(
                    RelationInfo(
                        src_node=record["src_id"],
                        tgt_node=record["tgt_id"],
                        relation_type=record["relation_type"]
                    )
                )

    state["markdown_blob"] = "\n".join(markdown_contents)
    state["entities"] = entities
    state["relations"] = relations
    return state


async def _generate_markdown(
    state: SectionProcessState
) -> SectionProcessState:
    user_id = state.get("user_id")
    model_id = state.get("default_document_reader_model_id")
    section_md_file_name = state.get("section_md_file_name")
    markdown_blob = state.get("markdown_blob", "")
    entities = state.get("entities", [])
    relations = state.get("relations", [])
    if user_id is None or model_id is None:
        raise Exception("Section workflow missing user_id or model_id")

    content = await make_section_markdown(
        user_id=user_id,
        model_id=model_id,
        current_markdown_content=section_md_file_name,
        new_markdown_contents_to_append=markdown_blob,
        entities=entities,
        relations=relations
    )
    state["content"] = content
    state.pop("markdown_blob", None)
    if not state.get("auto_illustration"):
        state.pop("entities", None)
        state.pop("relations", None)
    return state


async def _maybe_generate_images(
    state: SectionProcessState
) -> SectionProcessState:
    if not state.get("auto_illustration"):
        return state
    user_id = state.get("user_id")
    engine_id = state.get("default_image_generate_engine_id")
    if user_id is None or engine_id is None:
        return state

    with session_scope() as db:
        db_engine = crud.engine.get_engine_by_engine_id(
            db=db,
            engine_id=engine_id
        )
        if db_engine is None:
            raise Exception("There is something wrong with the user's default image generate engine")

    engine = await EngineProxy.create(
        user_id=user_id,
        engine_id=engine_id
    )
    content = state.get("content", "")
    entities = state.get("entities", [])
    relations = state.get("relations", [])
    images_plan = await ImageGenerateEngineBase.plan_images_with_llm(
        user_id=user_id,
        markdown=content,
        entities=entities,
        relations=relations,
    )
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

    state["content"] = content
    state.pop("entities", None)
    state.pop("relations", None)
    return state


async def _upload_and_finalize(
    state: SectionProcessState
) -> SectionProcessState:
    user_id = state.get("user_id")
    section_id = state.get("section_id")
    content = state.get("content", "")
    target_document_ids = state.get("target_document_ids", [])
    if user_id is None or section_id is None:
        raise Exception("Section workflow missing user_id or section_id")

    remote_file_service = await FileSystemProxy.create(
        user_id=user_id
    )
    md_file_name = f"markdown/{uuid.uuid4().hex}.md"
    await remote_file_service.upload_raw_content_to_path(
        file_path=md_file_name,
        content=content.encode("utf-8"),
        content_type="text/plain"
    )
    state["md_file_name"] = md_file_name
    state.pop("content", None)

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

        if target_document_ids:
            target_document_id_set = set(target_document_ids)
            db_section_documents = crud.section.get_section_documents_by_section_id(
                db=db,
                section_id=section_id
            )
            for db_section_document in db_section_documents:
                if db_section_document.document_id in target_document_id_set:
                    db_section_document.status = SectionDocumentIntegration.SUCCESS

        db.commit()

    return state


async def _maybe_podcast(
    state: SectionProcessState
) -> SectionProcessState:
    if state.get("auto_podcast"):
        section_id = state.get("section_id")
        user_id = state.get("user_id")
        if section_id is None or user_id is None:
            raise Exception("Section workflow missing section_id or user_id")
        await handle_update_section_ai_podcast(
            section_id=section_id,
            user_id=user_id
        )
    return state


async def handle_process_section(
    section_id: int,
    user_id: int,
    auto_podcast: bool = False,
):
    workflow = get_section_process_workflow()
    try:
        await workflow.ainvoke(
            {
                "section_id": section_id,
                "user_id": user_id,
                "auto_podcast": auto_podcast
            }
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
        raise e


def _build_workflow():
    workflow = StateGraph(SectionProcessState)
    workflow.add_node("load_context", _load_context)
    workflow.add_node("collect_markdown", _collect_markdown_and_entities)
    workflow.add_node("generate_markdown", _generate_markdown)
    workflow.add_node("maybe_generate_images", _maybe_generate_images)
    workflow.add_node("upload_and_finalize", _upload_and_finalize)
    workflow.add_node("maybe_podcast", _maybe_podcast)

    workflow.set_entry_point("load_context")
    workflow.add_edge("load_context", "collect_markdown")
    workflow.add_edge("collect_markdown", "generate_markdown")
    workflow.add_edge("generate_markdown", "maybe_generate_images")
    workflow.add_edge("maybe_generate_images", "upload_and_finalize")
    workflow.add_edge("upload_and_finalize", "maybe_podcast")
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
    await handle_process_section(
        section_id=section_id,
        user_id=user_id,
        auto_podcast=auto_podcast,
    )
