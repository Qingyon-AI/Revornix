import asyncio
import re
import uuid
from collections import deque
from datetime import datetime, timezone
from typing import TypedDict

import crud
from langgraph.graph import StateGraph, END

from common.ai import make_section_markdown
from common.logger import exception_logger, info_logger
from data.custom_types.all import EntityInfo, RelationInfo
from data.neo4j.base import neo4j_driver
from data.sql.base import session_scope
from enums.section import (
    SectionDocumentIntegration,
    SectionPodcastStatus,
    SectionProcessStatus,
)
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
    default_podcast_user_engine_id: int | None


WORKFLOW_NAME = "section_process"


ENTITY_QUERY = """
    MATCH (d:Document)
    WHERE d.creator_id = $user_id AND d.id IN $doc_ids
    MATCH (d)-[:HAS_CHUNK]->(:Chunk)-[:MENTIONS]->(e:Entity)
    WITH e, count(*) AS mention_count
    RETURN e.id AS id, e.text AS text, e.entity_type AS entity_type
    ORDER BY mention_count DESC, id ASC
"""

EDGE_QUERY = """
    MATCH (d:Document)
    WHERE d.creator_id = $user_id AND d.id IN $doc_ids
    MATCH (d)-[:HAS_CHUNK]->(:Chunk)-[:MENTIONS]->(e:Entity)
    WITH collect(DISTINCT e) AS entities
    UNWIND entities AS e1
    MATCH (e1)-[r]->(e2)
    WHERE e2 IN entities
    WITH e1, e2, type(r) AS relation_type, count(*) AS relation_count
    RETURN e1.id AS src_id, e2.id AS tgt_id, relation_type AS relation_type
    ORDER BY relation_count DESC, src_id ASC, tgt_id ASC, relation_type ASC
"""

DOCUMENT_MARKDOWN_FETCH_CONCURRENCY = 6
IMAGE_GENERATE_CONCURRENCY = 2
SECTION_MARKDOWN_BATCH_CHAR_LIMIT = 12_000
SECTION_MARKDOWN_CONTEXT_CHAR_LIMIT = 20_000
SECTION_MARKDOWN_CONTEXT_MIN_CHAR_LIMIT = 8_000
SECTION_MARKDOWN_CONTEXT_BACKOFF_RATE = 0.7
SECTION_MARKDOWN_MIN_SPLIT_CHARS = 2_000
SECTION_MARKDOWN_MAX_ENTITIES = 200
SECTION_MARKDOWN_MAX_RELATIONS = 300
SECTION_MARKDOWN_CONTEXT_HEAD_CHAR_LIMIT = 4_000
SECTION_MARKDOWN_CONTEXT_MEMORY_CHAR_LIMIT = 5_000

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
            return f"\n\n<!-- image reused: id={image_id} -->\n\n"

        used_ids.add(image_id)

        image_md = image_map.get(image_id)
        if not image_md:
            exception_logger.warning(f"[SectionImage] missing image for id={image_id}")
            return f"\n\n<!-- image missing: id={image_id} -->\n\n"

        normalized_image_md = image_md.strip()
        if normalized_image_md.startswith("data:image/"):
            normalized_image_md = f"![image]({normalized_image_md})"

        return f"\n\n{normalized_image_md}\n\n"

    pattern = re.compile(r"\[image-id:\s*([^\]]+)\]")
    return pattern.sub(repl, markdown_with_markers)


def _is_token_limit_error(error: Exception) -> bool:
    message = str(error).lower()
    return (
        "exceeded model token limit" in message
        or "maximum context length" in message
        or "context_length_exceeded" in message
    )


def _truncate_markdown_context(
    markdown: str | None,
    *,
    max_chars: int,
) -> str | None:
    if markdown is None or len(markdown) <= max_chars:
        return markdown

    head_limit = min(SECTION_MARKDOWN_CONTEXT_HEAD_CHAR_LIMIT, max_chars // 3)
    memory_limit = min(SECTION_MARKDOWN_CONTEXT_MEMORY_CHAR_LIMIT, max_chars // 3)
    tail_limit = max_chars - head_limit - memory_limit - 256
    if tail_limit < max_chars // 4:
        tail_limit = max_chars // 4
        memory_limit = max(1_200, max_chars - head_limit - tail_limit - 256)

    head = markdown[:head_limit].strip()
    tail = markdown[-tail_limit:].strip()
    memory = _build_markdown_memory(
        markdown=markdown,
        max_chars=memory_limit,
    ).strip()

    if not memory:
        compact = f"{head}\n\n...\n\n{tail}".strip()
        return compact[-max_chars:]

    structured = (
        "## Context Memory\n"
        f"{memory}\n\n"
        "## Section Head Snapshot\n"
        f"{head}\n\n"
        "## Section Tail Snapshot\n"
        f"{tail}"
    ).strip()
    if len(structured) <= max_chars:
        return structured

    overflow = len(structured) - max_chars
    if overflow >= len(tail):
        return structured[-max_chars:]
    tail = tail[overflow:].strip()
    structured = (
        "## Context Memory\n"
        f"{memory}\n\n"
        "## Section Head Snapshot\n"
        f"{head}\n\n"
        "## Section Tail Snapshot\n"
        f"{tail}"
    ).strip()
    return structured[-max_chars:]


def _build_markdown_memory(
    *,
    markdown: str,
    max_chars: int,
) -> str:
    lines = markdown.splitlines()
    memory_lines: list[str] = []
    idx = 0

    while idx < len(lines):
        line = lines[idx].strip()
        idx += 1
        if not line.startswith("#"):
            continue

        snippet = ""
        probe = idx
        while probe < len(lines):
            candidate = lines[probe].strip()
            probe += 1
            if not candidate:
                continue
            if candidate.startswith("#"):
                break
            snippet = candidate
            break

        if len(snippet) > 180:
            snippet = snippet[:177] + "..."
        if snippet:
            memory_lines.append(f"- {line} :: {snippet}")
        else:
            memory_lines.append(f"- {line}")

        candidate_memory = "\n".join(memory_lines)
        if len(candidate_memory) >= max_chars:
            break

    if not memory_lines:
        paragraphs = [p.strip() for p in markdown.split("\n\n") if p.strip()]
        fallback_parts: list[str] = []
        if paragraphs:
            first = paragraphs[0][:220]
            fallback_parts.append(f"- First paragraph: {first}")
        if len(paragraphs) > 1:
            last = paragraphs[-1][:220]
            fallback_parts.append(f"- Latest paragraph: {last}")
        memory_lines = fallback_parts

    memory = "\n".join(memory_lines).strip()
    if len(memory) > max_chars:
        memory = memory[: max_chars - 3].rstrip() + "..."
    return memory


def _split_text_near_middle(text: str) -> tuple[str, str]:
    if len(text) <= 1:
        return text, ""

    middle = len(text) // 2
    split_at = text.rfind("\n\n", 0, middle)
    if split_at < SECTION_MARKDOWN_MIN_SPLIT_CHARS:
        split_at = text.rfind("\n", 0, middle)
    if split_at < SECTION_MARKDOWN_MIN_SPLIT_CHARS:
        split_at = middle

    left = text[:split_at].strip()
    right = text[split_at:].strip()
    if not left or not right:
        left = text[:middle].strip()
        right = text[middle:].strip()
    return left, right


def _build_markdown_batches(
    markdown_contents: list[str],
    *,
    max_batch_chars: int,
) -> deque[str]:
    batches: list[str] = []
    current_parts: list[str] = []
    current_length = 0

    def _flush_current() -> None:
        nonlocal current_parts, current_length
        if not current_parts:
            return
        batch = "\n\n".join(part for part in current_parts if part.strip()).strip()
        if batch:
            batches.append(batch)
        current_parts = []
        current_length = 0

    for markdown in markdown_contents:
        remaining_text = markdown.strip()
        if not remaining_text:
            continue

        while remaining_text:
            if not current_parts:
                available = max_batch_chars
            else:
                available = max_batch_chars - current_length - 2

            if available <= SECTION_MARKDOWN_MIN_SPLIT_CHARS:
                _flush_current()
                available = max_batch_chars

            if len(remaining_text) <= available:
                current_parts.append(remaining_text)
                current_length += len(remaining_text) + (2 if len(current_parts) > 1 else 0)
                remaining_text = ""
                continue

            probe = remaining_text[:available]
            split_at = probe.rfind("\n\n")
            if split_at < SECTION_MARKDOWN_MIN_SPLIT_CHARS:
                split_at = probe.rfind("\n")
            if split_at < SECTION_MARKDOWN_MIN_SPLIT_CHARS:
                split_at = available

            part = remaining_text[:split_at].strip()
            if part:
                current_parts.append(part)
                current_length += len(part) + (2 if len(current_parts) > 1 else 0)
            _flush_current()
            remaining_text = remaining_text[split_at:].strip()

    _flush_current()
    return deque(batches)


async def _compose_section_markdown_in_batches(
    *,
    section_id: int,
    user_id: int,
    model_id: int,
    current_markdown_content: str | None,
    markdown_contents: list[str],
    entities: list[EntityInfo],
    relations: list[RelationInfo],
) -> str:
    pending_batches = _build_markdown_batches(
        markdown_contents=markdown_contents,
        max_batch_chars=SECTION_MARKDOWN_BATCH_CHAR_LIMIT,
    )
    if not pending_batches:
        return current_markdown_content or ""

    merged_markdown = current_markdown_content
    context_char_limit = SECTION_MARKDOWN_CONTEXT_CHAR_LIMIT
    merged_context_chars = 0 if current_markdown_content is None else len(current_markdown_content)
    consumed_batches = 0
    split_batches = 0
    context_backoff_count = 0

    while pending_batches:
        batch = pending_batches.popleft()
        if not batch.strip():
            continue

        batch_processed = False
        while not batch_processed:
            context_for_call = _truncate_markdown_context(
                merged_markdown,
                max_chars=context_char_limit,
            )
            merged_context_chars = 0 if context_for_call is None else len(context_for_call)

            try:
                with timed_stage(
                    workflow_name=WORKFLOW_NAME,
                    node_name="build_section_content",
                    stage_name="compose_section_markdown_batch",
                    context={
                        "section_id": section_id,
                        "batch_chars": len(batch),
                        "pending_batches": len(pending_batches),
                        "context_chars": merged_context_chars,
                    },
                ):
                    merged_markdown = await make_section_markdown(
                        user_id=user_id,
                        model_id=model_id,
                        current_markdown_content=context_for_call,
                        new_markdown_contents_to_append=batch,
                        entities=entities,
                        relations=relations
                    )
                consumed_batches += 1
                if context_char_limit < SECTION_MARKDOWN_CONTEXT_CHAR_LIMIT:
                    context_char_limit = min(
                        SECTION_MARKDOWN_CONTEXT_CHAR_LIMIT,
                        context_char_limit + 1200,
                    )
                batch_processed = True
            except Exception as compose_error:
                if not _is_token_limit_error(compose_error):
                    raise

                if context_char_limit > SECTION_MARKDOWN_CONTEXT_MIN_CHAR_LIMIT:
                    next_limit = max(
                        SECTION_MARKDOWN_CONTEXT_MIN_CHAR_LIMIT,
                        int(context_char_limit * SECTION_MARKDOWN_CONTEXT_BACKOFF_RATE),
                    )
                    if next_limit < context_char_limit:
                        context_backoff_count += 1
                        exception_logger.warning(
                            f"[SectionMarkdown] token limit hit and context backoff: section={section_id}, "
                            f"batch_chars={len(batch)}, context_chars={merged_context_chars}, "
                            f"context_limit={context_char_limit}, next_context_limit={next_limit}"
                        )
                        context_char_limit = next_limit
                        continue

                if len(batch) <= SECTION_MARKDOWN_MIN_SPLIT_CHARS * 2:
                    raise

                left, right = _split_text_near_middle(batch)
                if not left or not right:
                    raise

                split_batches += 1
                pending_batches.appendleft(right)
                pending_batches.appendleft(left)
                exception_logger.warning(
                    f"[SectionMarkdown] token limit hit and batch split: section={section_id}, "
                    f"original_chars={len(batch)}, left_chars={len(left)}, right_chars={len(right)}, "
                    f"context_chars={merged_context_chars}, pending_batches={len(pending_batches)}"
                )
                batch_processed = True

    info_logger.info(
        f"[WorkflowTiming] stage_summary workflow={WORKFLOW_NAME}, node=build_section_content, "
        f"stage=compose_section_markdown_batch, section_id={section_id}, "
        f"consumed_batches={consumed_batches}, split_batches={split_batches}, "
        f"context_backoff_count={context_backoff_count}, final_context_limit={context_char_limit}"
    )
    return merged_markdown or ""


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

    now = datetime.now(timezone.utc)
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
        state["default_podcast_user_engine_id"] = db_user.default_podcast_user_engine_id

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
                db_section_process_task.update_time = now
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
                db_section_process_task.update_time = now
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

    rebuild_from_all_documents = (
        section_md_file_name is not None
        and not (current_markdown_content or "").strip()
    )
    if rebuild_from_all_documents:
        with session_scope() as db:
            db_section_documents_all = crud.section.get_section_documents_by_section_id(
                db=db,
                section_id=section_id
            )
            fallback_target_ids: list[int] = []
            fallback_pending: list[tuple[int, str]] = []
            for section_document in db_section_documents_all:
                ready, reason = _get_document_ready_state(
                    db=db,
                    document_id=section_document.document_id
                )
                if ready:
                    fallback_target_ids.append(section_document.document_id)
                else:
                    fallback_pending.append((section_document.document_id, reason))
        if fallback_target_ids:
            target_document_ids = fallback_target_ids
        exception_logger.warning(
            f"[SectionMarkdown] previous markdown missing, fallback to rebuild from source docs: "
            f"section={section_id}, target_docs={len(target_document_ids)}, "
            f"pending_docs={len(fallback_pending)}"
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
                db_section_process_task.update_time = datetime.now(timezone.utc)
            db.commit()
        state["skip_processing"] = True
        return state

    success_document_ids: list[int] = []
    with session_scope() as db:
        db_section_documents_all = crud.section.get_section_documents_by_section_id(
            db=db,
            section_id=section_id
        )
        success_document_ids = [
            section_document.document_id
            for section_document in db_section_documents_all
            if section_document.status == SectionDocumentIntegration.SUCCESS
        ]
    graph_document_ids = list(dict.fromkeys(success_document_ids + ok_document_ids))
    if not graph_document_ids:
        graph_document_ids = ok_document_ids

    entities: list[EntityInfo] = []
    relations: list[RelationInfo] = []
    with timed_stage(
        workflow_name=WORKFLOW_NAME,
        node_name="build_section_content",
        stage_name="load_graph_entities_relations",
        context={
            "section_id": section_id,
            "ok_documents": len(ok_document_ids),
            "graph_documents": len(graph_document_ids),
        },
    ):
        with neo4j_driver.session() as session:
            entities_result = session.run(
                ENTITY_QUERY,
                user_id=user_id,
                doc_ids=graph_document_ids
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
                doc_ids=graph_document_ids
            )
            for record in relations_result:
                relations.append(
                    RelationInfo(
                        src_node=record["src_id"],
                        tgt_node=record["tgt_id"],
                        relation_type=record["relation_type"]
                    )
                )

    entities_for_ai = entities
    relations_for_ai = relations
    if len(entities_for_ai) > SECTION_MARKDOWN_MAX_ENTITIES:
        entities_for_ai = entities_for_ai[:SECTION_MARKDOWN_MAX_ENTITIES]
        exception_logger.warning(
            f"[SectionMarkdown] entities truncated for LLM: section={section_id}, "
            f"original={len(entities)}, used={len(entities_for_ai)}"
        )
    if len(relations_for_ai) > SECTION_MARKDOWN_MAX_RELATIONS:
        relations_for_ai = relations_for_ai[:SECTION_MARKDOWN_MAX_RELATIONS]
        exception_logger.warning(
            f"[SectionMarkdown] relations truncated for LLM: section={section_id}, "
            f"original={len(relations)}, used={len(relations_for_ai)}"
        )

    with timed_stage(
        workflow_name=WORKFLOW_NAME,
        node_name="build_section_content",
        stage_name="compose_section_markdown",
        context={
            "section_id": section_id,
            "markdown_sources": len(markdown_contents),
            "entities": len(entities_for_ai),
            "relations": len(relations_for_ai),
        },
    ):
        content = await _compose_section_markdown_in_batches(
            section_id=section_id,
            user_id=user_id,
            model_id=model_id,
            current_markdown_content=current_markdown_content,
            markdown_contents=markdown_contents,
            entities=entities_for_ai,
            relations=relations_for_ai,
        )

    if state.get("auto_illustration") and engine_id is not None:
        try:
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
                    entities=entities_for_ai,
                    relations=relations_for_ai,
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
        except Exception as e:
            exception_logger.warning(
                f"[SectionImage] illustration pipeline skipped: section={section_id}, error={e}"
            )

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
            now = datetime.now(timezone.utc)
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
            if state.get("auto_podcast") and state.get("default_podcast_user_engine_id") is not None:
                db_section_podcast_task = crud.task.get_section_podcast_task_by_section_id(
                    db=db,
                    section_id=section_id,
                )
                if db_section_podcast_task is None:
                    db_section_podcast_task = crud.task.create_section_podcast_task(
                        db=db,
                        user_id=user_id,
                        section_id=section_id,
                        status=SectionPodcastStatus.WAIT_TO,
                    )
                else:
                    db_section_podcast_task.status = SectionPodcastStatus.WAIT_TO
                    db_section_podcast_task.podcast_file_name = None
                    db_section_podcast_task.update_time = now
            if db_section_process_task is not None:
                db_section_process_task.status = SectionProcessStatus.SUCCESS
                db_section_process_task.update_time = now

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
        f"relations={len(relations)}, graph_documents={len(graph_document_ids)}, "
        f"rebuild_from_all_documents={rebuild_from_all_documents}, entities_used={len(entities_for_ai)}, "
        f"relations_used={len(relations_for_ai)}"
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
        engine_id = state.get("default_podcast_user_engine_id")
        if section_id is None or user_id is None:
            raise Exception("Section workflow missing section_id or user_id")
        if engine_id is None:
            exception_logger.warning(
                f"[SectionPodcast] skip auto podcast because default engine is not configured: section={section_id}, user_id={user_id}"
            )
            return state
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
                now = datetime.now(timezone.utc)
                db_section_process_task = crud.task.get_section_process_task_by_section_id(
                    db=db,
                    section_id=section_id
                )
                if db_section_process_task is not None:
                    db_section_process_task.status = SectionProcessStatus.FAILED
                    db_section_process_task.update_time = now
                db_section_documents = crud.section.get_section_documents_by_section_id(
                    db=db,
                    section_id=section_id
                )
                rolled_back_docs = 0
                for db_section_document in db_section_documents:
                    if db_section_document.status == SectionDocumentIntegration.SUPPLEMENTING:
                        db_section_document.status = SectionDocumentIntegration.WAIT_TO
                        rolled_back_docs += 1
                db.commit()
                if rolled_back_docs > 0:
                    exception_logger.warning(
                        f"Section {section_id} rollback supplementing documents to WAIT_TO: {rolled_back_docs}"
                    )
        except Exception as inner_exception:
            exception_logger.error(f"Failed to update section process status: {inner_exception}")
        raise
