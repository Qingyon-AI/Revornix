from typing import List, Dict, Any
from datetime import datetime
from sentence_transformers import SentenceTransformer
from data.custom_types.all import *
from data.neo4j.base import neo4j_driver
from data.milvus.search import naive_search

# 使用与你插入时相同的 embedding model（避免向量不一致）
embedding_model = SentenceTransformer("Qwen/Qwen3-Embedding-0.6B")

def to_neo4j_datetime_str(iso: str) -> str:
    return datetime.fromisoformat(iso).strftime("%Y-%m-%dT%H:%M:%S")

def build_time_filter(time_start: str | None, time_end: str | None, param_prefix="") -> tuple[str, dict]:
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

# ===================== Local Search =====================
def local_search_by_entity(entity_name: str, hops: int = 1, limit: int = 50) -> List[Dict[str, Any]]:
    """
    基于 Neo4j 的局部子图搜索：
    - 以实体名（或包含文本）匹配为起点
    - 使用 APOC 或 gds 子图遍历（apoc.path.subgraphNodes）
    - 返回对应 chunks（通过 MENTIONS 关系）
    """
    # 这里假设 driver 在主模块中已创建（与你插入脚本保持一致）
    with neo4j_driver.session() as sess:
        # 找到匹配的实体节点（模糊 contains 匹配）
        result = sess.run(
            """
            MATCH (e:Entity)
            WHERE toLower(e.text) CONTAINS toLower($ename) OR toLower(e.name) CONTAINS toLower($ename)
            WITH DISTINCT e
            CALL apoc.path.subgraphNodes(e, {maxLevel: $hops, labelFilter:'Chunk|Entity'}) YIELD node
            WITH CASE WHEN node:Chunk THEN node ELSE NULL END AS c1, node
            OPTIONAL MATCH (node)-[:MENTIONS]->(c2:Chunk)
            WITH collect(DISTINCT c1) + collect(DISTINCT c2) AS chunks
            UNWIND chunks AS c
            WITH DISTINCT c
            WHERE c IS NOT NULL
            RETURN c.id AS id, c.text AS text, c.doc_id AS doc_id, c.idx AS idx
            LIMIT $limit
            """,
            {"ename": entity_name, "hops": hops, "limit": limit}
        )
        out = []
        for r in result:
            if r["id"] is None:
                continue
            out.append({
                "chunk_id": r["id"],
                "text": r["text"],
                "doc_id": r["doc_id"],
                "idx": r["idx"]
            })
    return out

# ===================== Global Search =====================
def global_search(search_text: str, 
                  top_k: int = 10, 
                  expand_limit: int = 50, 
                  time_start: str | None = None, 
                  time_end: str | None = None) -> Dict[str, Any]:
    """
    全局检索流程：
    1) 在 Milvus 上做全局向量检索（得到 top_k chunk）
    2) 基于这些 chunk 扩展 Neo4j 子图（找出相关实体、其它 chunk、community）
       可选：筛选实体的 updated_at 是否在时间范围内。
    返回结构化结果：{ "seed_chunks": [...], "expanded_chunks": [...], "entities": [...] }
    """
    seed_chunks = naive_search(search_text, top_k=top_k)
    chunk_ids = [c["chunk_id"] for c in seed_chunks]

    expanded_chunks = []
    entities = []

    if not chunk_ids:
        return {"seed_chunks": seed_chunks, "expanded_chunks": expanded_chunks, "entities": entities}

    with neo4j_driver.session() as sess:
        # 构造动态 WHERE 过滤条件
        where_clauses = []
        if time_start:
            where_clauses.append("e.updated_at >= datetime($time_start)")
        if time_end:
            where_clauses.append("e.updated_at <= datetime($time_end)")
        where_filter = "WHERE " + " AND ".join(where_clauses) if where_clauses else ""

        cypher = f"""
        UNWIND $ids AS cid
        MATCH (c:Chunk {{id: cid}})
        OPTIONAL MATCH (c)-[:MENTIONS]->(e:Entity)
        {where_filter}
        OPTIONAL MATCH (e)<-[:MENTIONS]-(c2:Chunk)
        OPTIONAL MATCH (e)-[:BELONGS_TO]->(com:Community)
        RETURN DISTINCT e.id AS entity_id, e.text AS entity_text, e.entity_type AS entity_type,
               collect(DISTINCT c2.id)[0..$expand_limit] AS related_chunk_ids,
               collect(DISTINCT com.id)[0..$expand_limit] AS communities
        """

        params = {
            "ids": chunk_ids,
            "expand_limit": expand_limit,
        }
        if time_start:
            params["time_start"] = time_start
        if time_end:
            params["time_end"] = time_end

        records = sess.run(cypher, params)

        related_chunk_set = set()
        for r in records:
            eid = r["entity_id"]
            if eid:
                entities.append({
                    "entity_id": eid,
                    "text": r["entity_text"],
                    "entity_type": r["entity_type"],
                    "communities": r["communities"] or []
                })
            for cid in (r["related_chunk_ids"] or []):
                if cid:
                    related_chunk_set.add(cid)

        # 查相关 chunk
        if related_chunk_set:
            rows = sess.run(
                """
                UNWIND $ids AS cid
                MATCH (c:Chunk {id: cid})
                RETURN c.id AS id, c.text AS text, c.doc_id AS doc_id, c.idx AS idx
                """,
                {"ids": list(related_chunk_set)}
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
def hybrid_search(search_text: str, naive_k: int = 5, local_hops: int = 1, global_k: int = 10):
    """
    混合策略：
    - 先 local search（基于实体）拿到最相关局部上下文
    - 然后 naive/global 补充可能遗漏的全局信息
    返回合并结果（按优先级：local -> naive -> global expand）
    """
    # 1. local attempt（若能匹配实体，则优先）
    local_chunks = local_search_by_entity(search_text, hops=local_hops, limit=50)
    if local_chunks:
        # 若 local 有结果，则也同时拿 naive 做补充
        naive_chunks = naive_search(search_text, top_k=naive_k)
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
        g = global_search(search_text, top_k=global_k, expand_limit=50)
        # 合并 seed + expanded，按 score 已在 seed 中返回
        merged = {c["chunk_id"]: c for c in g["expanded_chunks"]}
        for s in g["seed_chunks"]:
            merged[s["chunk_id"]] = s
        return {"strategy": "global", "results": list(merged.values()), "meta": g}
