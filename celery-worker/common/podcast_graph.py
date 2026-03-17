from typing import Any

import crud

from data.sql.base import session_scope
from data.neo4j.base import neo4j_driver
from enums.section import SectionDocumentIntegration


PODCAST_GRAPH_MAX_ENTITIES = 8
PODCAST_GRAPH_MAX_RELATIONS = 8
PODCAST_GRAPH_MAX_EXCERPTS = 4
PODCAST_GRAPH_MAX_EXCERPT_LENGTH = 220


def _normalize_excerpt(text: str) -> str:
    compact = " ".join(text.split()).strip()
    if len(compact) <= PODCAST_GRAPH_MAX_EXCERPT_LENGTH:
        return compact
    return compact[: PODCAST_GRAPH_MAX_EXCERPT_LENGTH - 3].rstrip() + "..."


def _format_graph_context(
    *,
    entities: list[dict[str, Any]],
    relations: list[dict[str, Any]],
    excerpts: list[dict[str, Any]],
) -> str:
    parts: list[str] = []

    if entities:
        entity_lines = []
        for entity in entities:
            label = str(entity.get("text") or "").strip()
            if not label:
                continue
            entity_type = str(entity.get("entity_type") or "").strip()
            mention_count = int(entity.get("mention_count") or 0)
            if entity_type:
                entity_lines.append(f"- {label} ({entity_type}, mentions={mention_count})")
            else:
                entity_lines.append(f"- {label} (mentions={mention_count})")
        if entity_lines:
            parts.append("## Graph Anchors\n" + "\n".join(entity_lines))

    if relations:
        relation_lines = []
        for relation in relations:
            src_text = str(relation.get("src_text") or "").strip()
            tgt_text = str(relation.get("tgt_text") or "").strip()
            relation_type = str(relation.get("relation_type") or "").strip()
            if not src_text or not tgt_text or not relation_type:
                continue
            relation_lines.append(f"- {src_text} --{relation_type}--> {tgt_text}")
        if relation_lines:
            parts.append("## Key Relations\n" + "\n".join(relation_lines))

    if excerpts:
        excerpt_lines = []
        for excerpt in excerpts:
            chunk_idx = excerpt.get("idx")
            normalized_text = _normalize_excerpt(str(excerpt.get("text") or ""))
            if not normalized_text:
                continue
            if isinstance(chunk_idx, int):
                excerpt_lines.append(f"- Chunk {chunk_idx}: {normalized_text}")
            else:
                excerpt_lines.append(f"- {normalized_text}")
        if excerpt_lines:
            parts.append("## Supporting Excerpts\n" + "\n".join(excerpt_lines))

    return "\n\n".join(parts).strip()


def build_document_podcast_graph_context(
    *,
    document_id: int,
) -> tuple[str, dict[str, int]]:
    with neo4j_driver.session() as session:
        entity_records = list(
            session.run(
                """
                MATCH (d:Document {id: $doc_id})-[:HAS_CHUNK]->(c:Chunk)-[:MENTIONS]->(e:Entity)
                WITH e, count(*) AS mention_count, coalesce(e.degree, 0) AS degree
                RETURN e.id AS id,
                       e.text AS text,
                       e.entity_type AS entity_type,
                       mention_count AS mention_count
                ORDER BY degree DESC, mention_count DESC, id ASC
                LIMIT $entity_limit
                """,
                doc_id=document_id,
                entity_limit=PODCAST_GRAPH_MAX_ENTITIES,
            )
        )
        entity_ids = [str(record["id"]) for record in entity_records if record["id"] is not None]

        relation_records: list[Any] = []
        excerpt_records: list[Any] = []
        if entity_ids:
            relation_records = list(
                session.run(
                    """
                    UNWIND $entity_ids AS src_id
                    MATCH (e1:Entity {id: src_id})-[r]->(e2:Entity)
                    WHERE e2.id IN $entity_ids
                    WITH e1, e2, type(r) AS relation_type, count(*) AS relation_count
                    RETURN e1.text AS src_text,
                           e2.text AS tgt_text,
                           relation_type AS relation_type
                    ORDER BY relation_count DESC, src_text ASC, tgt_text ASC, relation_type ASC
                    LIMIT $relation_limit
                    """,
                    entity_ids=entity_ids,
                    relation_limit=PODCAST_GRAPH_MAX_RELATIONS,
                )
            )
            excerpt_records = list(
                session.run(
                    """
                    MATCH (d:Document {id: $doc_id})-[:HAS_CHUNK]->(c:Chunk)-[:MENTIONS]->(e:Entity)
                    WHERE e.id IN $entity_ids
                    WITH DISTINCT c, c.idx AS chunk_idx
                    RETURN c.id AS chunk_id,
                           c.text AS text,
                           chunk_idx AS idx
                    ORDER BY chunk_idx ASC, chunk_id ASC
                    LIMIT $excerpt_limit
                    """,
                    doc_id=document_id,
                    entity_ids=entity_ids,
                    excerpt_limit=PODCAST_GRAPH_MAX_EXCERPTS,
                )
            )

    entities = [
        {
            "id": record.get("id"),
            "text": record.get("text"),
            "entity_type": record.get("entity_type"),
            "mention_count": record.get("mention_count"),
        }
        for record in entity_records
    ]
    relations = [
        {
            "src_text": record.get("src_text"),
            "tgt_text": record.get("tgt_text"),
            "relation_type": record.get("relation_type"),
        }
        for record in relation_records
    ]
    excerpts = [
        {
            "chunk_id": record.get("chunk_id"),
            "text": record.get("text"),
            "idx": record.get("idx"),
        }
        for record in excerpt_records
    ]

    return _format_graph_context(
        entities=entities,
        relations=relations,
        excerpts=excerpts,
    ), {
        "entities": len(entities),
        "relations": len(relations),
        "excerpts": len(excerpts),
    }


def _get_section_graph_document_ids(*, section_id: int) -> list[int]:
    with session_scope() as db:
        db_section_documents = crud.section.get_section_documents_by_section_id(
            db=db,
            section_id=section_id,
        )
        success_document_ids = [
            int(section_document.document_id)
            for section_document in db_section_documents
            if section_document.status == SectionDocumentIntegration.SUCCESS
        ]
        if success_document_ids:
            return success_document_ids

        documents = crud.section.get_documents_for_section_by_section_id(
            db=db,
            section_id=section_id,
        )
        return [int(document.id) for document in documents]


def build_section_podcast_graph_context(
    *,
    section_id: int,
    user_id: int,
) -> tuple[str, dict[str, int]]:
    document_ids = _get_section_graph_document_ids(section_id=section_id)
    if not document_ids:
        return "", {"entities": 0, "relations": 0, "excerpts": 0}

    with neo4j_driver.session() as session:
        entity_records = list(
            session.run(
                """
                MATCH (d:Document)
                WHERE d.creator_id = $user_id AND d.id IN $doc_ids
                MATCH (d)-[:HAS_CHUNK]->(c:Chunk)-[:MENTIONS]->(e:Entity)
                WITH e, count(*) AS mention_count, coalesce(e.degree, 0) AS degree
                RETURN e.id AS id,
                       e.text AS text,
                       e.entity_type AS entity_type,
                       mention_count AS mention_count
                ORDER BY degree DESC, mention_count DESC, id ASC
                LIMIT $entity_limit
                """,
                user_id=user_id,
                doc_ids=document_ids,
                entity_limit=PODCAST_GRAPH_MAX_ENTITIES,
            )
        )
        entity_ids = [str(record["id"]) for record in entity_records if record["id"] is not None]

        relation_records: list[Any] = []
        excerpt_records: list[Any] = []
        if entity_ids:
            relation_records = list(
                session.run(
                    """
                    MATCH (d:Document)
                    WHERE d.creator_id = $user_id AND d.id IN $doc_ids
                    MATCH (d)-[:HAS_CHUNK]->(:Chunk)-[:MENTIONS]->(e:Entity)
                    WITH collect(DISTINCT e) AS entities
                    UNWIND entities AS e1
                    MATCH (e1)-[r]->(e2)
                    WHERE e2 IN entities AND e1.id IN $entity_ids AND e2.id IN $entity_ids
                    WITH e1, e2, type(r) AS relation_type, count(*) AS relation_count
                    RETURN e1.text AS src_text,
                           e2.text AS tgt_text,
                           relation_type AS relation_type
                    ORDER BY relation_count DESC, src_text ASC, tgt_text ASC, relation_type ASC
                    LIMIT $relation_limit
                    """,
                    user_id=user_id,
                    doc_ids=document_ids,
                    entity_ids=entity_ids,
                    relation_limit=PODCAST_GRAPH_MAX_RELATIONS,
                )
            )
            excerpt_records = list(
                session.run(
                    """
                    MATCH (d:Document)
                    WHERE d.creator_id = $user_id AND d.id IN $doc_ids
                    MATCH (d)-[:HAS_CHUNK]->(c:Chunk)-[:MENTIONS]->(e:Entity)
                    WHERE e.id IN $entity_ids
                    WITH DISTINCT c, c.idx AS chunk_idx
                    RETURN c.id AS chunk_id,
                           c.text AS text,
                           chunk_idx AS idx
                    ORDER BY chunk_idx ASC, chunk_id ASC
                    LIMIT $excerpt_limit
                    """,
                    user_id=user_id,
                    doc_ids=document_ids,
                    entity_ids=entity_ids,
                    excerpt_limit=PODCAST_GRAPH_MAX_EXCERPTS,
                )
            )

    entities = [
        {
            "id": record.get("id"),
            "text": record.get("text"),
            "entity_type": record.get("entity_type"),
            "mention_count": record.get("mention_count"),
        }
        for record in entity_records
    ]
    relations = [
        {
            "src_text": record.get("src_text"),
            "tgt_text": record.get("tgt_text"),
            "relation_type": record.get("relation_type"),
        }
        for record in relation_records
    ]
    excerpts = [
        {
            "chunk_id": record.get("chunk_id"),
            "text": record.get("text"),
            "idx": record.get("idx"),
        }
        for record in excerpt_records
    ]

    return _format_graph_context(
        entities=entities,
        relations=relations,
        excerpts=excerpts,
    ), {
        "entities": len(entities),
        "relations": len(relations),
        "excerpts": len(excerpts),
    }
