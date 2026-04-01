import hashlib
import json
import re
import uuid
from datetime import datetime, timezone
from typing import Any

import crud
from langfuse import propagate_attributes
from langfuse.openai import AsyncOpenAI

from common.logger import exception_logger, info_logger
from common.markdown_helpers import (
    get_markdown_content_by_document_id,
    get_markdown_content_by_section_id,
)
from common.usage_billing import persist_model_usage_from_completion
from data.common import build_sampled_chunk_indexes, ensure_document_chunk_snapshot, stream_chunk_document
from data.sql.base import session_scope
from data.neo4j.base import neo4j_driver
from enums.document import DocumentSummarizeStatus
from enums.section import SectionDocumentIntegration
from prompts.section_knowledge_snapshot import (
    SECTION_KNOWLEDGE_SNAPSHOT_SYSTEM,
    build_section_knowledge_snapshot_user_prompt,
)
from proxy.ai_model_proxy import AIModelProxy
from proxy.file_system_proxy import FileSystemProxy


KNOWLEDGE_SNAPSHOT_WORKFLOW_NAME = "section_knowledge_snapshot"
SECTION_MARKDOWN_PROMPT_LIMIT = 10_000
DOCUMENT_MARKDOWN_PROMPT_LIMIT = 2_400
DOCUMENT_EVIDENCE_CHUNK_LIMIT = 3
SECTION_GRAPH_ENTITY_LIMIT = 36
SECTION_GRAPH_RELATION_LIMIT = 36
SECTION_IMAGE_ASSET_LIMIT = 12
MARKDOWN_IMAGE_PATTERN = re.compile(r"!\[[^\]]*\]\(([^)]+)\)")


def _normalize_text(text: str) -> str:
    return " ".join(str(text).split()).strip()


def _truncate_text(text: str, limit: int) -> str:
    normalized = _normalize_text(text)
    if len(normalized) <= limit:
        return normalized
    return normalized[: max(0, limit - 3)].rstrip() + "..."


def _compact_markdown(markdown: str, *, max_chars: int) -> str:
    if len(markdown) <= max_chars:
        return markdown
    head_limit = max_chars // 2
    tail_limit = max_chars // 3
    head = markdown[:head_limit].strip()
    tail = markdown[-tail_limit:].strip()
    return f"{head}\n\n...\n\n{tail}"


def _json_dumps(data: Any) -> str:
    return json.dumps(data, ensure_ascii=False, sort_keys=True)


def _sha256_text(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def _extract_json_object(content: str) -> dict[str, Any]:
    stripped = content.strip()
    if stripped.startswith("```"):
        stripped = re.sub(r"^```(?:json)?\s*", "", stripped)
        stripped = re.sub(r"\s*```$", "", stripped)
    start = stripped.find("{")
    end = stripped.rfind("}")
    if start == -1 or end == -1 or end <= start:
        raise ValueError("LLM did not return a JSON object")
    return json.loads(stripped[start:end + 1])


async def _safe_close_async_client(client: AsyncOpenAI) -> None:
    close_fn = getattr(client, "close", None)
    if callable(close_fn):
        result = close_fn()
        if hasattr(result, "__await__"):
            await result
        return
    aclose_fn = getattr(client, "aclose", None)
    if callable(aclose_fn):
        result = aclose_fn()
        if hasattr(result, "__await__"):
            await result


def _normalize_int_refs(values: Any, *, allowed: set[int]) -> list[int]:
    if not isinstance(values, list):
        return []
    result: list[int] = []
    seen: set[int] = set()
    for value in values:
        try:
            parsed = int(value)
        except (TypeError, ValueError):
            continue
        if parsed not in allowed or parsed in seen:
            continue
        seen.add(parsed)
        result.append(parsed)
    return result


def _normalize_str_refs(values: Any, *, allowed: set[str]) -> list[str]:
    if not isinstance(values, list):
        return []
    result: list[str] = []
    seen: set[str] = set()
    for value in values:
        text = str(value).strip()
        if not text or text not in allowed or text in seen:
            continue
        seen.add(text)
        result.append(text)
    return result


def _extract_markdown_images(
    *,
    owner_tag: str,
    markdown: str,
    source_document_id: int | None,
    preferred_slide_types: list[str],
) -> list[dict[str, Any]]:
    results: list[dict[str, Any]] = []
    seen: set[str] = set()
    for index, match in enumerate(MARKDOWN_IMAGE_PATTERN.finditer(markdown), start=1):
        image_ref = match.group(1).strip()
        if not image_ref or image_ref in seen:
            continue
        seen.add(image_ref)
        results.append(
            {
                "asset_key": f"{owner_tag}-img-{index}",
                "kind": "markdown_image",
                "source_document_id": source_document_id,
                "preferred_slide_types": preferred_slide_types,
                "file_name": image_ref if not image_ref.startswith("data:image/") else None,
                "data_uri": image_ref if image_ref.startswith("data:image/") else None,
            }
        )
        if len(results) >= SECTION_IMAGE_ASSET_LIMIT:
            break
    return results


async def _collect_document_evidence(
    *,
    document_id: int,
    user_id: int,
) -> list[dict[str, Any]]:
    try:
        snapshot = await ensure_document_chunk_snapshot(
            doc_id=document_id,
            user_id=user_id,
        )
        selected_indexes = set(
            build_sampled_chunk_indexes(
                total_chunks=snapshot.chunk_count,
                sample_chunks=min(DOCUMENT_EVIDENCE_CHUNK_LIMIT, snapshot.chunk_count),
            )
        )
        chunks: list[dict[str, Any]] = []
        async for chunk_info in stream_chunk_document(
            doc_id=document_id,
            user_id=user_id,
            chunk_snapshot_path=snapshot.chunk_path,
            prefer_snapshot=True,
            selected_chunk_indexes=selected_indexes,
        ):
            chunks.append(
                {
                    "chunk_id": chunk_info.id,
                    "document_id": document_id,
                    "idx": chunk_info.idx,
                    "excerpt": _truncate_text(chunk_info.text, 280),
                }
            )
        chunks.sort(key=lambda item: (item.get("idx") or 0, item["chunk_id"]))
        return chunks[:DOCUMENT_EVIDENCE_CHUNK_LIMIT]
    except Exception as error:
        exception_logger.warning(
            f"[SectionSnapshot] collect evidence failed: document_id={document_id}, error={error}"
        )
        return []


def _collect_section_graph(
    *,
    user_id: int,
    document_ids: list[int],
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    if not document_ids:
        return [], []

    entity_query = """
        MATCH (d:Document)
        WHERE d.creator_id = $user_id AND d.id IN $doc_ids
        MATCH (d)-[:HAS_CHUNK]->(c:Chunk)-[:MENTIONS]->(e:Entity)
        WITH e, count(*) AS mention_count, collect(DISTINCT c.id)[0..6] AS chunk_ids
        RETURN e.id AS id,
               e.text AS text,
               e.entity_type AS entity_type,
               mention_count AS mention_count,
               chunk_ids AS chunk_ids
        ORDER BY mention_count DESC, id ASC
        LIMIT $entity_limit
    """
    relation_query = """
        MATCH (d:Document)
        WHERE d.creator_id = $user_id AND d.id IN $doc_ids
        MATCH (d)-[:HAS_CHUNK]->(:Chunk)-[:MENTIONS]->(e:Entity)
        WITH collect(DISTINCT e) AS entities
        UNWIND entities AS e1
        MATCH (e1)-[r]->(e2)
        WHERE e2 IN entities
        WITH e1, e2, type(r) AS relation_type, count(*) AS relation_count
        RETURN e1.id AS src_id,
               e1.text AS src_text,
               e2.id AS tgt_id,
               e2.text AS tgt_text,
               relation_type AS relation_type,
               relation_count AS relation_count
        ORDER BY relation_count DESC, src_id ASC, tgt_id ASC, relation_type ASC
        LIMIT $relation_limit
    """
    with neo4j_driver.session() as session:
        entity_rows = list(
            session.run(
                entity_query,
                user_id=user_id,
                doc_ids=document_ids,
                entity_limit=SECTION_GRAPH_ENTITY_LIMIT,
            )
        )
        relation_rows = list(
            session.run(
                relation_query,
                user_id=user_id,
                doc_ids=document_ids,
                relation_limit=SECTION_GRAPH_RELATION_LIMIT,
            )
        )

    entities = [
        {
            "entity_id": str(row["id"]),
            "text": str(row.get("text") or "").strip(),
            "entity_type": str(row.get("entity_type") or "").strip(),
            "mention_count": int(row.get("mention_count") or 0),
            "chunk_ids": [str(chunk_id) for chunk_id in (row.get("chunk_ids") or [])],
        }
        for row in entity_rows
        if row.get("id") is not None
    ]
    relations = []
    for row in relation_rows:
        src_id = row.get("src_id")
        tgt_id = row.get("tgt_id")
        relation_type = str(row.get("relation_type") or "").strip()
        if src_id is None or tgt_id is None or not relation_type:
            continue
        relations.append(
            {
                "relation_id": f"{src_id}|{relation_type}|{tgt_id}",
                "src_id": str(src_id),
                "src_text": str(row.get("src_text") or "").strip(),
                "tgt_id": str(tgt_id),
                "tgt_text": str(row.get("tgt_text") or "").strip(),
                "relation_type": relation_type,
                "relation_count": int(row.get("relation_count") or 0),
            }
        )
    return entities, relations


def _build_fallback_knowledge_pack(
    *,
    section_title: str,
    documents: list[dict[str, Any]],
    evidence_chunks: list[dict[str, Any]],
    entities: list[dict[str, Any]],
    relations: list[dict[str, Any]],
    image_assets: list[dict[str, Any]],
) -> dict[str, Any]:
    topics: list[dict[str, Any]] = []
    knowledge_points: list[dict[str, Any]] = []
    core_conclusions: list[dict[str, Any]] = []

    evidence_by_document_id: dict[int, list[dict[str, Any]]] = {}
    for chunk in evidence_chunks:
        evidence_by_document_id.setdefault(int(chunk["document_id"]), []).append(chunk)

    for index, document in enumerate(documents[:8], start=1):
        topic_id = f"topic-{index}"
        topic_title = document["title"]
        primary_chunk_ids = [
            item["chunk_id"]
            for item in evidence_by_document_id.get(document["document_id"], [])
        ][:DOCUMENT_EVIDENCE_CHUNK_LIMIT]
        summary_text = document.get("summary") or document.get("description") or document.get("markdown_excerpt") or topic_title
        knowledge_point_id = f"kp-{index}"
        deck_role = "main" if index <= 5 else "appendix"
        knowledge_points.append(
            {
                "id": knowledge_point_id,
                "title": topic_title,
                "statement": _truncate_text(summary_text, 220),
                "topic_id": topic_id,
                "deck_role": deck_role,
                "source_document_ids": [document["document_id"]],
                "source_chunk_ids": primary_chunk_ids,
                "source_entity_ids": [],
                "source_relation_ids": [],
            }
        )
        topics.append(
            {
                "id": topic_id,
                "title": topic_title,
                "summary": _truncate_text(summary_text, 180),
                "knowledge_point_ids": [knowledge_point_id],
                "source_document_ids": [document["document_id"]],
            }
        )
        if index <= 3:
            core_conclusions.append(
                {
                    "id": f"conclusion-{index}",
                    "title": topic_title,
                    "statement": _truncate_text(summary_text, 140),
                    "source_knowledge_point_ids": [knowledge_point_id],
                    "source_document_ids": [document["document_id"]],
                }
            )

    key_relations: list[dict[str, Any]] = []
    for index, relation in enumerate(relations[:3], start=1):
        key_relations.append(
            {
                "id": f"relation-view-{index}",
                "title": f"{relation['src_text']} -> {relation['tgt_text']}",
                "explanation": _truncate_text(
                    f"{relation['src_text']} {relation['relation_type']} {relation['tgt_text']}",
                    180,
                ),
                "source_relation_ids": [relation["relation_id"]],
                "source_entity_ids": [relation["src_id"], relation["tgt_id"]],
                "source_document_ids": [],
            }
        )

    main_deck_candidates = [
        {
            "id": f"deck-main-{index}",
            "title": topic["title"],
            "summary": topic["summary"],
            "knowledge_point_ids": topic["knowledge_point_ids"],
            "source_document_ids": topic["source_document_ids"],
            "source_entity_ids": [],
        }
        for index, topic in enumerate(topics[:5], start=1)
    ]
    appendix_candidates = [
        {
            "id": f"appendix-{index}",
            "title": topic["title"],
            "summary": topic["summary"],
            "knowledge_point_ids": topic["knowledge_point_ids"],
            "source_document_ids": topic["source_document_ids"],
        }
        for index, topic in enumerate(topics[5:], start=1)
    ]
    image_candidates = [
        {
            "id": f"image-candidate-{index}",
            "title": asset["asset_key"],
            "why": f"Existing visual asset for {section_title}",
            "preferred_slide_types": asset.get("preferred_slide_types") or ["topic"],
            "source_document_ids": (
                [asset["source_document_id"]]
                if asset.get("source_document_id") is not None
                else []
            ),
            "asset_key": asset["asset_key"],
        }
        for index, asset in enumerate(image_assets[:6], start=1)
    ]
    return {
        "topic_clusters": topics,
        "knowledge_points": knowledge_points,
        "core_conclusions": core_conclusions,
        "key_relations": key_relations,
        "main_deck_candidates": main_deck_candidates,
        "appendix_candidates": appendix_candidates,
        "image_candidates": image_candidates,
    }


def _normalize_knowledge_pack(
    *,
    raw_pack: dict[str, Any],
    fallback_pack: dict[str, Any],
    documents: list[dict[str, Any]],
    evidence_chunks: list[dict[str, Any]],
    entities: list[dict[str, Any]],
    relations: list[dict[str, Any]],
    image_assets: list[dict[str, Any]],
) -> dict[str, Any]:
    allowed_document_ids = {int(document["document_id"]) for document in documents}
    allowed_chunk_ids = {str(chunk["chunk_id"]) for chunk in evidence_chunks}
    allowed_entity_ids = {str(entity["entity_id"]) for entity in entities}
    allowed_relation_ids = {str(relation["relation_id"]) for relation in relations}
    allowed_asset_keys = {str(asset["asset_key"]) for asset in image_assets}

    raw_knowledge_points = raw_pack.get("knowledge_points")
    if not isinstance(raw_knowledge_points, list):
        return {**fallback_pack, "image_source_assets": image_assets}

    knowledge_points: list[dict[str, Any]] = []
    topic_id_candidates: list[str] = []
    for index, item in enumerate(raw_knowledge_points, start=1):
        if not isinstance(item, dict):
            continue
        topic_id = str(item.get("topic_id") or f"topic-{index}").strip()
        topic_id_candidates.append(topic_id)
        source_document_ids = _normalize_int_refs(
            item.get("source_document_ids"),
            allowed=allowed_document_ids,
        )
        if not source_document_ids:
            continue
        deck_role = "appendix" if str(item.get("deck_role") or "").strip().lower() == "appendix" else "main"
        knowledge_points.append(
            {
                "id": str(item.get("id") or f"kp-{index}"),
                "title": _truncate_text(str(item.get("title") or "Knowledge point"), 80),
                "statement": _truncate_text(str(item.get("statement") or ""), 220),
                "topic_id": topic_id,
                "deck_role": deck_role,
                "source_document_ids": source_document_ids,
                "source_chunk_ids": _normalize_str_refs(item.get("source_chunk_ids"), allowed=allowed_chunk_ids),
                "source_entity_ids": _normalize_str_refs(item.get("source_entity_ids"), allowed=allowed_entity_ids),
                "source_relation_ids": _normalize_str_refs(item.get("source_relation_ids"), allowed=allowed_relation_ids),
            }
        )

    if len(knowledge_points) < 2:
        return {**fallback_pack, "image_source_assets": image_assets}

    knowledge_point_ids = {item["id"] for item in knowledge_points}
    available_topic_ids = {item["topic_id"] for item in knowledge_points}

    raw_topics = raw_pack.get("topic_clusters")
    topics: list[dict[str, Any]] = []
    if isinstance(raw_topics, list):
        for index, item in enumerate(raw_topics, start=1):
            if not isinstance(item, dict):
                continue
            topic_id = str(item.get("id") or f"topic-{index}").strip()
            if topic_id not in available_topic_ids:
                continue
            topic_knowledge_point_ids = _normalize_str_refs(
                item.get("knowledge_point_ids"),
                allowed=knowledge_point_ids,
            )
            if not topic_knowledge_point_ids:
                topic_knowledge_point_ids = [
                    knowledge_point["id"]
                    for knowledge_point in knowledge_points
                    if knowledge_point["topic_id"] == topic_id
                ]
            topics.append(
                {
                    "id": topic_id,
                    "title": _truncate_text(str(item.get("title") or "Topic"), 80),
                    "summary": _truncate_text(str(item.get("summary") or ""), 180),
                    "knowledge_point_ids": topic_knowledge_point_ids,
                    "source_document_ids": _normalize_int_refs(
                        item.get("source_document_ids"),
                        allowed=allowed_document_ids,
                    ) or sorted(
                        {
                            document_id
                            for knowledge_point in knowledge_points
                            if knowledge_point["topic_id"] == topic_id
                            for document_id in knowledge_point["source_document_ids"]
                        }
                    ),
                }
            )
    if not topics:
        return {**fallback_pack, "image_source_assets": image_assets}

    def _fallback_conclusions() -> list[dict[str, Any]]:
        results = []
        for index, knowledge_point in enumerate(
            [item for item in knowledge_points if item["deck_role"] == "main"][:3],
            start=1,
        ):
            results.append(
                {
                    "id": f"conclusion-{index}",
                    "title": knowledge_point["title"],
                    "statement": knowledge_point["statement"],
                    "source_knowledge_point_ids": [knowledge_point["id"]],
                    "source_document_ids": knowledge_point["source_document_ids"],
                }
            )
        return results

    raw_conclusions = raw_pack.get("core_conclusions")
    conclusions: list[dict[str, Any]] = []
    if isinstance(raw_conclusions, list):
        for index, item in enumerate(raw_conclusions, start=1):
            if not isinstance(item, dict):
                continue
            source_knowledge_point_ids = _normalize_str_refs(
                item.get("source_knowledge_point_ids"),
                allowed=knowledge_point_ids,
            )
            if not source_knowledge_point_ids:
                continue
            conclusions.append(
                {
                    "id": str(item.get("id") or f"conclusion-{index}"),
                    "title": _truncate_text(str(item.get("title") or "Conclusion"), 80),
                    "statement": _truncate_text(str(item.get("statement") or ""), 160),
                    "source_knowledge_point_ids": source_knowledge_point_ids,
                    "source_document_ids": _normalize_int_refs(
                        item.get("source_document_ids"),
                        allowed=allowed_document_ids,
                    ) or sorted(
                        {
                            document_id
                            for knowledge_point in knowledge_points
                            if knowledge_point["id"] in source_knowledge_point_ids
                            for document_id in knowledge_point["source_document_ids"]
                        }
                    ),
                }
            )
    if not conclusions:
        conclusions = _fallback_conclusions()

    raw_key_relations = raw_pack.get("key_relations")
    key_relations: list[dict[str, Any]] = []
    if isinstance(raw_key_relations, list):
        for index, item in enumerate(raw_key_relations, start=1):
            if not isinstance(item, dict):
                continue
            source_relation_ids = _normalize_str_refs(
                item.get("source_relation_ids"),
                allowed=allowed_relation_ids,
            )
            source_entity_ids = _normalize_str_refs(
                item.get("source_entity_ids"),
                allowed=allowed_entity_ids,
            )
            if not source_relation_ids and not source_entity_ids:
                continue
            key_relations.append(
                {
                    "id": str(item.get("id") or f"relation-view-{index}"),
                    "title": _truncate_text(str(item.get("title") or "Key relation"), 80),
                    "explanation": _truncate_text(str(item.get("explanation") or ""), 180),
                    "source_relation_ids": source_relation_ids,
                    "source_entity_ids": source_entity_ids,
                    "source_document_ids": _normalize_int_refs(
                        item.get("source_document_ids"),
                        allowed=allowed_document_ids,
                    ),
                }
            )
    if not key_relations:
        key_relations = fallback_pack.get("key_relations", [])

    raw_main_deck = raw_pack.get("main_deck_candidates")
    main_deck_candidates: list[dict[str, Any]] = []
    if isinstance(raw_main_deck, list):
        for index, item in enumerate(raw_main_deck, start=1):
            if not isinstance(item, dict):
                continue
            kp_ids = _normalize_str_refs(item.get("knowledge_point_ids"), allowed=knowledge_point_ids)
            if not kp_ids:
                continue
            main_deck_candidates.append(
                {
                    "id": str(item.get("id") or f"deck-main-{index}"),
                    "title": _truncate_text(str(item.get("title") or "Main angle"), 80),
                    "summary": _truncate_text(str(item.get("summary") or ""), 180),
                    "knowledge_point_ids": kp_ids,
                    "source_document_ids": _normalize_int_refs(
                        item.get("source_document_ids"),
                        allowed=allowed_document_ids,
                    ) or sorted(
                        {
                            document_id
                            for knowledge_point in knowledge_points
                            if knowledge_point["id"] in kp_ids
                            for document_id in knowledge_point["source_document_ids"]
                        }
                    ),
                    "source_entity_ids": _normalize_str_refs(item.get("source_entity_ids"), allowed=allowed_entity_ids),
                }
            )
    if not main_deck_candidates:
        main_deck_candidates = fallback_pack.get("main_deck_candidates", [])

    raw_appendix = raw_pack.get("appendix_candidates")
    appendix_candidates: list[dict[str, Any]] = []
    if isinstance(raw_appendix, list):
        for index, item in enumerate(raw_appendix, start=1):
            if not isinstance(item, dict):
                continue
            kp_ids = _normalize_str_refs(item.get("knowledge_point_ids"), allowed=knowledge_point_ids)
            if not kp_ids:
                continue
            appendix_candidates.append(
                {
                    "id": str(item.get("id") or f"appendix-{index}"),
                    "title": _truncate_text(str(item.get("title") or "Appendix"), 80),
                    "summary": _truncate_text(str(item.get("summary") or ""), 180),
                    "knowledge_point_ids": kp_ids,
                    "source_document_ids": _normalize_int_refs(
                        item.get("source_document_ids"),
                        allowed=allowed_document_ids,
                    ) or sorted(
                        {
                            document_id
                            for knowledge_point in knowledge_points
                            if knowledge_point["id"] in kp_ids
                            for document_id in knowledge_point["source_document_ids"]
                        }
                    ),
                }
            )
    if not appendix_candidates:
        appendix_candidates = fallback_pack.get("appendix_candidates", [])

    raw_images = raw_pack.get("image_candidates")
    image_candidates: list[dict[str, Any]] = []
    if isinstance(raw_images, list):
        for index, item in enumerate(raw_images, start=1):
            if not isinstance(item, dict):
                continue
            preferred_slide_types = item.get("preferred_slide_types")
            if not isinstance(preferred_slide_types, list):
                preferred_slide_types = ["topic"]
            asset_key = item.get("asset_key")
            normalized_asset_key = str(asset_key).strip() if asset_key is not None else None
            if normalized_asset_key and normalized_asset_key not in allowed_asset_keys:
                normalized_asset_key = None
            image_candidates.append(
                {
                    "id": str(item.get("id") or f"image-candidate-{index}"),
                    "title": _truncate_text(str(item.get("title") or "Image"), 80),
                    "why": _truncate_text(str(item.get("why") or ""), 160),
                    "preferred_slide_types": [str(value) for value in preferred_slide_types[:3]],
                    "source_document_ids": _normalize_int_refs(
                        item.get("source_document_ids"),
                        allowed=allowed_document_ids,
                    ),
                    "asset_key": normalized_asset_key,
                }
            )
    if not image_candidates:
        image_candidates = fallback_pack.get("image_candidates", [])

    return {
        "topic_clusters": topics,
        "knowledge_points": knowledge_points,
        "core_conclusions": conclusions,
        "key_relations": key_relations,
        "main_deck_candidates": main_deck_candidates,
        "appendix_candidates": appendix_candidates,
        "image_candidates": image_candidates,
        "image_source_assets": image_assets,
    }


def _build_traceability_manifest(
    *,
    knowledge_pack: dict[str, Any],
    documents: list[dict[str, Any]],
    evidence_chunks: list[dict[str, Any]],
    entities: list[dict[str, Any]],
    relations: list[dict[str, Any]],
    image_assets: list[dict[str, Any]],
) -> dict[str, Any]:
    knowledge_points = knowledge_pack.get("knowledge_points", [])
    appendix_ids = {
        item["id"]
        for item in knowledge_points
        if item.get("deck_role") == "appendix"
    }
    coverage: list[dict[str, Any]] = []
    for document in documents:
        document_id = int(document["document_id"])
        referenced_kp_ids = [
            knowledge_point["id"]
            for knowledge_point in knowledge_points
            if document_id in knowledge_point.get("source_document_ids", [])
        ]
        if any(kp_id not in appendix_ids for kp_id in referenced_kp_ids):
            status = "covered"
        elif referenced_kp_ids:
            status = "appendix"
        else:
            status = "merged"
        coverage.append(
            {
                "document_id": document_id,
                "title": document["title"],
                "status": status,
                "knowledge_point_ids": referenced_kp_ids,
            }
        )

    return {
        "knowledge_points": [
            {
                "knowledge_point_id": knowledge_point["id"],
                "source_document_ids": knowledge_point.get("source_document_ids", []),
                "source_chunk_ids": knowledge_point.get("source_chunk_ids", []),
                "source_entity_ids": knowledge_point.get("source_entity_ids", []),
                "source_relation_ids": knowledge_point.get("source_relation_ids", []),
            }
            for knowledge_point in knowledge_points
        ],
        "documents": coverage,
        "source_registry": {
            "documents": documents,
            "chunks": evidence_chunks,
            "entities": entities,
            "relations": relations,
            "images": image_assets,
        },
    }


async def _generate_knowledge_pack_with_llm(
    *,
    user_id: int,
    model_id: int,
    payload: dict[str, Any],
) -> dict[str, Any]:
    model_conf = (await AIModelProxy.create(
        user_id=user_id,
        model_id=model_id,
    )).get_configuration()
    client = AsyncOpenAI(
        api_key=model_conf.api_key,
        base_url=model_conf.base_url,
    )
    try:
        with propagate_attributes(
            user_id=str(user_id),
            tags=[f"model:{model_conf.model_name}"],
        ):
            completion = await client.chat.completions.create(
                model=model_conf.model_name,
                messages=[
                    {"role": "system", "content": SECTION_KNOWLEDGE_SNAPSHOT_SYSTEM},
                    {"role": "user", "content": build_section_knowledge_snapshot_user_prompt(payload)},
                ],
                response_format={"type": "json_object"},
            )
        persist_model_usage_from_completion(
            user_id=user_id,
            model_id=model_id,
            completion=completion,
            source="section_knowledge_snapshot",
        )
        content = completion.choices[0].message.content
        if content is None:
            raise ValueError("Section knowledge snapshot LLM returned empty content")
        return _extract_json_object(content)
    finally:
        await _safe_close_async_client(client)


async def generate_section_knowledge_snapshot(
    *,
    section_id: int,
    user_id: int,
) -> int:
    remote_file_service = await FileSystemProxy.create(user_id=user_id)

    with session_scope() as db:
        db_section = crud.section.get_section_by_section_id(
            db=db,
            section_id=section_id,
        )
        if db_section is None:
            raise Exception("Section not found for knowledge snapshot")
        db_user = crud.user.get_user_by_id(db=db, user_id=user_id)
        if db_user is None or db_user.default_document_reader_model_id is None:
            raise Exception("Default document reader model is required for section knowledge snapshot")
        db_section_documents = crud.section.get_section_documents_by_section_id(
            db=db,
            section_id=section_id,
        )
        success_document_ids = [
            int(item.document_id)
            for item in db_section_documents
            if item.status == SectionDocumentIntegration.SUCCESS
        ]
        db_documents = crud.section.get_documents_for_section_by_section_id(
            db=db,
            section_id=section_id,
        )
        db_documents = [
            document
            for document in db_documents
            if int(document.id) in success_document_ids
        ]
        summary_task_by_document_id = {
            int(task.document_id): task
            for task in crud.task.get_document_summarize_tasks_by_document_ids(
                db=db,
                document_ids=success_document_ids,
            )
            if task.status == DocumentSummarizeStatus.SUCCESS and task.summary
        }
        db_latest_snapshot = crud.section.get_latest_section_knowledge_snapshot_by_section_id(
            db=db,
            section_id=section_id,
        )
        version = 1 if db_latest_snapshot is None else int(db_latest_snapshot.version) + 1
        model_id = int(db_user.default_document_reader_model_id)

    if not db_documents:
        raise Exception("No integrated documents available for section knowledge snapshot")

    section_markdown = await get_markdown_content_by_section_id(
        section_id=section_id,
        user_id=user_id,
        remote_file_service=remote_file_service,
    )
    section_markdown_excerpt = _compact_markdown(
        section_markdown,
        max_chars=SECTION_MARKDOWN_PROMPT_LIMIT,
    )

    documents: list[dict[str, Any]] = []
    evidence_chunks: list[dict[str, Any]] = []
    image_assets: list[dict[str, Any]] = []

    if db_section.cover:
        image_assets.append(
            {
                "asset_key": f"section-cover-{section_id}",
                "kind": "section_cover",
                "source_document_id": None,
                "preferred_slide_types": ["cover"],
                "file_name": db_section.cover,
                "data_uri": None,
            }
        )

    image_assets.extend(
        _extract_markdown_images(
            owner_tag=f"section-{section_id}",
            markdown=section_markdown,
            source_document_id=None,
            preferred_slide_types=["cover", "topic", "core_conclusion"],
        )
    )

    for db_document in db_documents:
        markdown_content = await get_markdown_content_by_document_id(
            document_id=db_document.id,
            user_id=user_id,
            remote_file_service=remote_file_service,
        )
        markdown_excerpt = _compact_markdown(
            markdown_content,
            max_chars=DOCUMENT_MARKDOWN_PROMPT_LIMIT,
        )
        summary_task = summary_task_by_document_id.get(int(db_document.id))
        summary = summary_task.summary if summary_task is not None else None
        documents.append(
            {
                "document_id": int(db_document.id),
                "title": db_document.title,
                "description": db_document.description,
                "summary": summary,
                "markdown_excerpt": markdown_excerpt,
            }
        )
        evidence_chunks.extend(
            await _collect_document_evidence(
                document_id=int(db_document.id),
                user_id=user_id,
            )
        )
        image_assets.extend(
            _extract_markdown_images(
                owner_tag=f"document-{db_document.id}",
                markdown=markdown_content,
                source_document_id=int(db_document.id),
                preferred_slide_types=["topic", "appendix"],
            )
        )

    # keep stable order and cap noisy image assets
    dedup_image_assets: list[dict[str, Any]] = []
    seen_image_refs: set[str] = set()
    for asset in image_assets:
        ref = asset.get("data_uri") or asset.get("file_name") or asset["asset_key"]
        if ref in seen_image_refs:
            continue
        seen_image_refs.add(ref)
        dedup_image_assets.append(asset)
        if len(dedup_image_assets) >= SECTION_IMAGE_ASSET_LIMIT:
            break
    image_assets = dedup_image_assets

    entities, relations = _collect_section_graph(
        user_id=user_id,
        document_ids=success_document_ids,
    )

    snapshot_payload = {
        "section": {
            "id": section_id,
            "title": db_section.title,
            "description": db_section.description,
            "markdown_excerpt": section_markdown_excerpt,
        },
        "documents": documents,
        "evidence_chunks": evidence_chunks,
        "entities": entities,
        "relations": relations,
        "image_assets": [
            {
                "asset_key": asset["asset_key"],
                "kind": asset["kind"],
                "source_document_id": asset.get("source_document_id"),
                "preferred_slide_types": asset.get("preferred_slide_types") or [],
            }
            for asset in image_assets
        ],
    }
    source_hash = _sha256_text(_json_dumps(snapshot_payload))

    fallback_pack = _build_fallback_knowledge_pack(
        section_title=db_section.title,
        documents=documents,
        evidence_chunks=evidence_chunks,
        entities=entities,
        relations=relations,
        image_assets=image_assets,
    )
    try:
        raw_pack = await _generate_knowledge_pack_with_llm(
            user_id=user_id,
            model_id=model_id,
            payload=snapshot_payload,
        )
    except Exception as error:
        exception_logger.warning(
            f"[SectionSnapshot] llm snapshot generation failed, fallback engaged: section_id={section_id}, error={error}"
        )
        raw_pack = fallback_pack

    knowledge_pack = _normalize_knowledge_pack(
        raw_pack=raw_pack,
        fallback_pack=fallback_pack,
        documents=documents,
        evidence_chunks=evidence_chunks,
        entities=entities,
        relations=relations,
        image_assets=image_assets,
    )
    traceability_manifest = _build_traceability_manifest(
        knowledge_pack=knowledge_pack,
        documents=documents,
        evidence_chunks=evidence_chunks,
        entities=entities,
        relations=relations,
        image_assets=image_assets,
    )

    knowledge_pack_file_name = f"section-snapshots/{uuid.uuid4().hex}.knowledge-pack.json"
    traceability_manifest_file_name = f"section-snapshots/{uuid.uuid4().hex}.traceability-manifest.json"
    await remote_file_service.upload_raw_content_to_path(
        file_path=knowledge_pack_file_name,
        content=json.dumps(knowledge_pack, ensure_ascii=False, indent=2).encode("utf-8"),
        content_type="application/json",
    )
    await remote_file_service.upload_raw_content_to_path(
        file_path=traceability_manifest_file_name,
        content=json.dumps(traceability_manifest, ensure_ascii=False, indent=2).encode("utf-8"),
        content_type="application/json",
    )

    with session_scope() as db:
        snapshot = crud.section.create_section_knowledge_snapshot(
            db=db,
            user_id=user_id,
            section_id=section_id,
            version=version,
            source_hash=source_hash,
            knowledge_pack_file_name=knowledge_pack_file_name,
            traceability_manifest_file_name=traceability_manifest_file_name,
            document_count=len(documents),
            knowledge_point_count=len(knowledge_pack.get("knowledge_points", [])),
            topic_count=len(knowledge_pack.get("topic_clusters", [])),
            image_candidate_count=len(knowledge_pack.get("image_candidates", [])),
        )
        db.commit()
        snapshot_id = int(snapshot.id)

    info_logger.info(
        f"[WorkflowTiming] stage_summary workflow={KNOWLEDGE_SNAPSHOT_WORKFLOW_NAME}, "
        f"section_id={section_id}, snapshot_id={snapshot_id}, version={version}, "
        f"documents={len(documents)}, knowledge_points={len(knowledge_pack.get('knowledge_points', []))}, "
        f"topics={len(knowledge_pack.get('topic_clusters', []))}, "
        f"image_candidates={len(knowledge_pack.get('image_candidates', []))}"
    )
    return snapshot_id
