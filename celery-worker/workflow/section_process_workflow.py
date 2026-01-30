import re
import uuid
from typing import TypedDict

import crud
from langgraph.graph import StateGraph, END

from common.ai import make_section_markdown
from common.logger import exception_logger
from data.custom_types.all import EntityInfo, RelationInfo
from data.neo4j.base import neo4j_driver
from data.sql.base import SessionLocal
from enums.section import SectionDocumentIntegration, SectionProcessStatus
from base_implement.image_generate_engine_base import ImageGenerateEngineBase
from schemas.section import GeneratedImage
from schemas.task import SectionOverrideProperty
from common.markdown_helpers import get_markdown_content_by_document_id
from workflow.section_podcast_workflow import handle_update_section_ai_podcast
from proxy.engine_proxy import EngineProxy
from proxy.file_system_proxy import FileSystemProxy


class SectionProcessState(TypedDict, total=False):
    section_id: int
    user_id: int
    auto_podcast: bool


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


async def handle_process_section(
    section_id: int,
    user_id: int,
    auto_podcast: bool = False,
    override: SectionOverrideProperty | None = None
):
    db = SessionLocal()
    try:
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
        markdown_contents = []
        entities: list[EntityInfo] = []
        relations: list[RelationInfo] = []
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
            db_engine = crud.engine.get_engine_by_engine_id(
                db=db,
                engine_id=db_user.default_image_generate_engine_id
            )
            if db_engine is None:
                raise Exception("There is something wrong with the user's default image generate engine")
            
            engine = await EngineProxy.create(
                user_id=user_id,
                engine_id=db_user.default_image_generate_engine_id
            )

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

        remote_file_service = await FileSystemProxy.create(
            user_id=user_id
        )
        md_file_name = f"markdown/{uuid.uuid4().hex}.md"
        await remote_file_service.upload_raw_content_to_path(
            file_path=md_file_name,
            content=content.encode("utf-8"),
            content_type="text/plain"
        )
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
    except Exception as e:
        exception_logger.error(f"Error processing section {section_id}: {e}")
        db_section_process_task = crud.task.get_section_process_task_by_section_id(
            db=db,
            section_id=section_id
        )
        if db_section_process_task is not None:
            db_section_process_task.status = SectionProcessStatus.FAILED
            db.commit()


async def _process_section(state: SectionProcessState) -> SectionProcessState:
    section_id = state.get("section_id")
    user_id = state.get("user_id")
    if section_id is None or user_id is None:
        raise Exception("Section workflow missing section_id or user_id")

    auto_podcast = bool(state.get("auto_podcast", False))
    override_obj = None
    raw_override = state.get("override")
    if raw_override is not None:
        if isinstance(raw_override, SectionOverrideProperty):
            override_obj = raw_override
        else:
            override_obj = SectionOverrideProperty.model_validate(raw_override)

    await handle_process_section(
        section_id=section_id,
        user_id=user_id,
        auto_podcast=auto_podcast,
        override=override_obj
    )
    return state


def _build_workflow():
    workflow = StateGraph(SectionProcessState)
    workflow.add_node("process_section", _process_section)
    workflow.set_entry_point("process_section")
    workflow.add_edge("process_section", END)
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
    await workflow.ainvoke(
        {
            "section_id": section_id,
            "user_id": user_id,
            "auto_podcast": auto_podcast,
        }
    )
