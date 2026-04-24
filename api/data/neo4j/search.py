from datetime import datetime
from typing import Any

from data.custom_types.all import *
from data.milvus.search import naive_search
from data.neo4j.base import async_neo4j_driver


def to_neo4j_datetime_str(
    iso: str
) -> str:
    """Normalize ISO timestamps into the datetime format expected by Neo4j."""
    return datetime.fromisoformat(iso).strftime("%Y-%m-%dT%H:%M:%S")

def build_time_filter(
    time_start: str | None,
    time_end: str | None,
    param_prefix=""
) -> tuple[str, dict]:
    """
    构造 Neo4j Cypher 的时间范围 WHERE 子句和参数字典
    """
    clauses = []
    params = {}
    if time_start:
        key = f"{param_prefix}time_start"
        clauses.append(f"c.created_at >= datetime(${key})")
        params[key] = to_neo4j_datetime_str(time_start)
    if time_end:
        key = f"{param_prefix}time_end"
        clauses.append(f"c.created_at <= datetime(${key})")
        params[key] = to_neo4j_datetime_str(time_end)
    return (" AND " + " AND ".join(clauses)) if clauses else "", params


async def section_graph_search(
    *,
    document_ids: list[int],
    seed_chunk_ids: list[str],
    expand_limit: int = 6,
    entity_limit: int = 8,
    entity_label_limit: int = 3,
    entity_doc_limit: int = 4,
) -> dict[str, Any]:
    """
    专栏范围图扩展检索：
    1) 基于首轮召回的 seed chunks 找到共享实体
    2) 在当前专栏 document_ids 范围内找出命中这些实体的其它 chunks
    """
    # 先收敛检索范围，避免把其它专栏或重复 chunk 混进图扩展结果。
    normalized_document_ids = sorted({int(document_id) for document_id in document_ids})
    normalized_seed_chunk_ids = sorted(
        {str(chunk_id) for chunk_id in seed_chunk_ids if str(chunk_id).strip()}
    )
    if not normalized_document_ids or not normalized_seed_chunk_ids:
        return {"expanded_chunks": [], "entities": []}

    entities: list[dict[str, Any]] = []

    async with async_neo4j_driver.session() as sess:
        # 先从首轮命中的 chunks 提取“共享实体”，这些实体会作为图扩展的桥。
        entity_records = await sess.run(
            """
            UNWIND $chunk_ids AS chunk_id
            MATCH (seed:Chunk {id: chunk_id})<-[:HAS_CHUNK]-(seed_doc:Document)
            WHERE seed_doc.id IN $doc_ids
            MATCH (seed)-[:MENTIONS]->(entity:Entity)
            MATCH (entity)<-[:MENTIONS]-(chunk:Chunk)<-[:HAS_CHUNK]-(doc:Document)
            WHERE doc.id IN $doc_ids
            RETURN entity.id AS entity_id,
                   entity.text AS entity_text,
                   entity.entity_type AS entity_type,
                   count(DISTINCT chunk) AS mention_count,
                   collect(DISTINCT doc.id)[0..$entity_doc_limit] AS document_ids
            ORDER BY mention_count DESC, entity_text ASC
            LIMIT $entity_limit
            """,
            {
                "chunk_ids": normalized_seed_chunk_ids,
                "doc_ids": normalized_document_ids,
                "entity_limit": entity_limit,
                "entity_doc_limit": entity_doc_limit,
            },
        )

        entity_ids: list[str] = []
        async for record in entity_records:
            entity_id = record.get("entity_id")
            if entity_id is None:
                continue
            entity_id = str(entity_id)
            entity_ids.append(entity_id)
            entities.append(
                {
                    "entity_id": entity_id,
                    "text": record.get("entity_text"),
                    "entity_type": record.get("entity_type"),
                    "mention_count": record.get("mention_count"),
                    "document_ids": record.get("document_ids") or [],
                }
            )

        if not entity_ids:
            return {"expanded_chunks": [], "entities": entities}

        # 再回到当前专栏文档范围内，找出同样命中这些实体但没在首轮出现过的 chunks。
        chunk_records = await sess.run(
            """
            UNWIND $entity_ids AS entity_id
            MATCH (entity:Entity {id: entity_id})<-[:MENTIONS]-(chunk:Chunk)<-[:HAS_CHUNK]-(doc:Document)
            WHERE doc.id IN $doc_ids AND NOT chunk.id IN $chunk_ids
            WITH chunk, doc,
                 collect(DISTINCT entity.text)[0..$entity_label_limit] AS entity_texts,
                 count(DISTINCT entity) AS entity_overlap
            RETURN chunk.id AS chunk_id,
                   chunk.text AS text,
                   doc.id AS doc_id,
                   chunk.idx AS idx,
                   entity_texts,
                   entity_overlap
            ORDER BY entity_overlap DESC,
                     coalesce(doc.id, 2147483647),
                     coalesce(chunk.idx, 2147483647),
                     coalesce(chunk.id, "")
            LIMIT $expand_limit
            """,
            {
                "entity_ids": entity_ids,
                "doc_ids": normalized_document_ids,
                "chunk_ids": normalized_seed_chunk_ids,
                "expand_limit": expand_limit,
                "entity_label_limit": entity_label_limit,
            },
        )

        expanded_chunks = []
        async for record in chunk_records:
            if record["chunk_id"] is None:
                continue
            expanded_chunks.append(
                {
                    "chunk_id": record["chunk_id"],
                    "text": record["text"],
                    "doc_id": record["doc_id"],
                    "idx": record["idx"],
                    "entity_texts": record.get("entity_texts") or [],
                    "entity_overlap": record.get("entity_overlap"),
                }
            )

    return {"expanded_chunks": expanded_chunks, "entities": entities}

# ===================== Local Search =====================
async def local_search_by_entity(
    user_id: int,
    entity_name: str,
    hops: int = 1,
    limit: int = 50
) -> list[dict[str, Any]]:
    """
    局部实体子图搜索（带用户权限）：
    - Entity 名称模糊匹配
    - 子图遍历 Entity + Chunk
    - 过滤 chunk 所属 document 是否为当前用户
    """
    async with async_neo4j_driver.session() as sess:
        result = await sess.run(
            """
            // 1. 匹配目标实体
            MATCH (e:Entity)
            WHERE toLower(e.text) CONTAINS toLower($ename)
               OR toLower(e.name) CONTAINS toLower($ename)

            // 2. 遍历子图：Entity & Chunk
            CALL apoc.path.subgraphNodes(e, {
                maxLevel: $hops,
                labelFilter:'Entity|Chunk'
            }) YIELD node

            // 3. 只保留 Chunk 类型节点
            WITH CASE WHEN node:Chunk THEN node ELSE NULL END AS c1, node

            // 4. 找到 Entity 关联的 Chunk
            OPTIONAL MATCH (node)-[:MENTIONS]->(c2:Chunk)

            WITH collect(DISTINCT c1) + collect(DISTINCT c2) AS chunks
            UNWIND chunks AS c
            WITH DISTINCT c
            WHERE c IS NOT NULL

            // 5. 过滤用户可访问的 Chunk
            MATCH (c)<-[:HAS_CHUNK]-(d:Document)
            WHERE d.creator_id = $user_id

            RETURN c.id AS id, c.text AS text, c.doc_id AS doc_id, c.idx AS idx
            LIMIT $limit
            """,
            {"ename": entity_name, "hops": hops, "limit": limit, "user_id": user_id}
        )

        output = []
        async for r in result:
            if r["id"] is None:
                continue
            output.append(
                {
                    "chunk_id": r["id"],
                    "text": r["text"],
                    "doc_id": r["doc_id"],
                    "idx": r["idx"]
                }
            )
        return output

# ===================== Global Search =====================
async def global_search(
    user_id: int,
    search_text: str,
    top_k: int = 10,
    expand_limit: int = 50,
    time_start: str | None = None,
    time_end: str | None = None
) -> dict[str, Any]:
    """
    全局检索流程（带 user_id 权限过滤）：
    1) 在 Milvus 上做全局向量检索（得到 top_k chunk）
    2) 在 Neo4j 中扩展：找到与用户相关的 Entity / Chunk / Community
    """
    seed_chunks = await naive_search(
        user_id=user_id,
        search_text=search_text,
        top_k=top_k
    )
    chunk_ids = [c["chunk_id"] for c in seed_chunks]

    expanded_chunks = []
    entities = []

    if not chunk_ids:
        return {"seed_chunks": seed_chunks, "expanded_chunks": [], "entities": []}

    async with async_neo4j_driver.session() as sess:
        # 构造动态 WHERE 条件（包含时间筛选）
        where_clauses = [
            "d.creator_id = $user_id"  # 用户权限控制
        ]
        if time_start:
            where_clauses.append("e.updated_at >= datetime($time_start)")
        if time_end:
            where_clauses.append("e.updated_at <= datetime($time_end)")
        where_filter = "WHERE " + " AND ".join(where_clauses)

        cypher = f"""
        UNWIND $ids AS cid
        MATCH (c:Chunk {{id: cid}})
        MATCH (c)<-[:HAS_CHUNK]-(d:Document)
        {where_filter}
        OPTIONAL MATCH (c)-[:MENTIONS]->(e:Entity)
        OPTIONAL MATCH (e)<-[:MENTIONS]-(c2:Chunk)<-[:HAS_CHUNK]-(d2:Document)
        WHERE d2.creator_id = $user_id  // 相关 chunk 的文档也要过滤
        OPTIONAL MATCH (e)-[:BELONGS_TO]->(com:Community)
        RETURN DISTINCT 
            e.id AS entity_id,
            e.text AS entity_text,
            e.entity_type AS entity_type,
            collect(DISTINCT c2.id)[0..$expand_limit] AS related_chunk_ids,
            collect(DISTINCT com.id)[0..$expand_limit] AS communities
        """

        params = {
            "ids": chunk_ids,
            "user_id": user_id,
            "expand_limit": expand_limit,
        }
        if time_start:
            params["time_start"] = time_start
        if time_end:
            params["time_end"] = time_end

        records = await sess.run(cypher, params)

        related_chunk_set = set()
        async for r in records:
            if eid := r["entity_id"]:
                entities.append({
                    "entity_id": eid,
                    "text": r["entity_text"],
                    "entity_type": r["entity_type"],
                    "communities": r["communities"] or []
                })
            for cid in (r["related_chunk_ids"] or []):
                if cid:
                    related_chunk_set.add(cid)

        # 查找相关 chunk（也需校验用户权限）
        if related_chunk_set:
            rows = await sess.run(
                """
                UNWIND $ids AS cid
                MATCH (c:Chunk {id: cid})<-[:HAS_CHUNK]-(d:Document)
                WHERE d.creator_id = $user_id
                RETURN c.id AS id, c.text AS text, c.doc_id AS doc_id, c.idx AS idx
                """,
                {"ids": list(related_chunk_set), "user_id": user_id}
            )
            async for r in rows:
                expanded_chunks.append({
                    "chunk_id": r["id"],
                    "text": r["text"],
                    "doc_id": r["doc_id"],
                    "idx": r["idx"]
                })

    return {
        "seed_chunks": seed_chunks,
        "expanded_chunks": expanded_chunks,
        "entities": entities
    }
