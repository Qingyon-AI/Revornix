from typing import Dict, Any
from datetime import datetime
from data.custom_types.all import *
from data.neo4j.base import neo4j_driver
from data.milvus.search import naive_search

def to_neo4j_datetime_str(
    iso: str
) -> str:
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

# ===================== Entity Context Hash Lookup =====================
def get_entity_context_hashes(
    entity_keys: list[tuple[str, str]]
) -> dict[tuple[str, str], set[str | None]]:
    if not entity_keys:
        return {}
    rows = [
        {"entity_type": entity_type, "text": text}
        for (entity_type, text) in entity_keys
    ]
    result_map: dict[tuple[str, str], set[str | None]] = {
        (entity_type, text): set() for (entity_type, text) in entity_keys
    }
    cypher = """
    UNWIND $rows AS r
    MATCH (e:Entity {text: r.text, entity_type: r.entity_type})
    RETURN r.text AS text, r.entity_type AS entity_type, collect(DISTINCT e.context_hash) AS hashes
    """
    with neo4j_driver.session() as sess:
        records = sess.run(cypher, {"rows": rows})
        for r in records:
            key = (r["entity_type"], r["text"])
            hashes = r["hashes"] or []
            result_map[key].update(hashes)
    return result_map

def get_entities_by_text_and_type(
    entity_keys: list[tuple[str, str]]
) -> dict[tuple[str, str], list[Dict[str, Any]]]:
    if not entity_keys:
        return {}
    rows = [
        {"entity_type": entity_type, "text": text}
        for (entity_type, text) in entity_keys
    ]
    result_map: dict[tuple[str, str], list[Dict[str, Any]]] = {
        (entity_type, text): [] for (entity_type, text) in entity_keys
    }
    cypher = """
    UNWIND $rows AS r
    MATCH (e:Entity {text: r.text, entity_type: r.entity_type})
    RETURN r.text AS text, r.entity_type AS entity_type,
           collect({
             id: e.id,
             context_hash: e.context_hash,
             context_sample: e.context_sample,
             context_embedding: e.context_embedding
           }) AS entities
    """
    with neo4j_driver.session() as sess:
        records = sess.run(cypher, {"rows": rows})
        for r in records:
            key = (r["entity_type"], r["text"])
            result_map[key] = r["entities"] or []
    return result_map

# ===================== Local Search =====================
def local_search_by_entity(
    user_id: int,
    entity_name: str,
    hops: int = 1,
    limit: int = 50
) -> list[Dict[str, Any]]:
    """
    局部实体子图搜索（带用户权限）：
    - Entity 名称模糊匹配
    - 子图遍历 Entity + Chunk
    - 过滤 chunk 所属 document 是否为当前用户
    """
    with neo4j_driver.session() as sess:
        result = sess.run(
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

        return [
            {
                "chunk_id": r["id"],
                "text": r["text"],
                "doc_id": r["doc_id"],
                "idx": r["idx"]
            }
            for r in result if r["id"] is not None
        ]

# ===================== Global Search =====================
def global_search(
    user_id: int,
    search_text: str,
    top_k: int = 10,
    expand_limit: int = 50,
    time_start: str | None = None,
    time_end: str | None = None
) -> Dict[str, Any]:
    """
    全局检索流程（带 user_id 权限过滤）：
    1) 在 Milvus 上做全局向量检索（得到 top_k chunk）
    2) 在 Neo4j 中扩展：找到与用户相关的 Entity / Chunk / Community
    """
    seed_chunks = naive_search(
        user_id=user_id,
        search_text=search_text, 
        top_k=top_k
    )
    chunk_ids = [c["chunk_id"] for c in seed_chunks]

    expanded_chunks = []
    entities = []

    if not chunk_ids:
        return {"seed_chunks": seed_chunks, "expanded_chunks": [], "entities": []}

    with neo4j_driver.session() as sess:
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

        records = sess.run(cypher, params)

        related_chunk_set = set()
        for r in records:
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
            rows = sess.run(
                """
                UNWIND $ids AS cid
                MATCH (c:Chunk {id: cid})<-[:HAS_CHUNK]-(d:Document)
                WHERE d.creator_id = $user_id
                RETURN c.id AS id, c.text AS text, c.doc_id AS doc_id, c.idx AS idx
                """,
                {"ids": list(related_chunk_set), "user_id": user_id}
            )
            for r in rows:
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

# ===================== 小工具：一条 API 把三种策略合并并返回（可选） =====================
def hybrid_search(
    user_id: int, 
    search_text: str, 
    naive_k: int = 5, 
    local_hops: int = 1, 
    global_k: int = 10
):
    """
    混合策略：
    - 先 local search（基于实体）拿到最相关局部上下文
    - 然后 naive/global 补充可能遗漏的全局信息
    返回合并结果（按优先级：local -> naive -> global expand）
    """
    # 1. local attempt（若能匹配实体，则优先）
    local_chunks = local_search_by_entity(
        user_id=user_id,
        entity_name=search_text, 
        hops=local_hops, 
        limit=50
    )
    if local_chunks:
        # 若 local 有结果，则也同时拿 naive 做补充
        naive_chunks = naive_search(
            user_id=user_id,
            search_text=search_text, 
            top_k=naive_k
        )
        # 做简单合并（保序且去重）
        seen = set()
        merged = []
        for c in local_chunks + naive_chunks:
            cid = c.get("chunk_id") or c.get("id")
            if cid not in seen:
                seen.add(cid)
                merged.append(c)
        return {"strategy": "local+naive", "results": merged}
    else:
        # local 没有命中实体，退回 global (naive + expand)
        g = global_search(
            user_id=user_id, 
            search_text=search_text, 
            top_k=global_k, 
            expand_limit=50
        )
        # 合并 seed + expanded，按 score 已在 seed 中返回
        merged = {c["chunk_id"]: c for c in g["expanded_chunks"]}
        for s in g["seed_chunks"]:
            merged[s["chunk_id"]] = s
        return {"strategy": "global", "results": list(merged.values()), "meta": g}
