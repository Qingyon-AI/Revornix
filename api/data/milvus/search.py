from typing import cast, Any
from pymilvus.client.search_result import SearchResult
from data.milvus.base import milvus_client, MILVUS_COLLECTION
from pymilvus import AnnSearchRequest, WeightedRanker
from protocol.embedding_engine import EmbeddingEngine

def _normalize_search_result(results):
    if hasattr(results, "result"):  # SearchFuture
        results = results.result()
    return results

def _parse_results(results: SearchResult) -> list[dict[str, Any]]:
    results = cast(SearchResult, _normalize_search_result(results))
    out = []
    for hits in results:
        for hit in hits:
            ent = hit.entity
            out.append({
                "chunk_id": ent.get("id"),
                "text": ent.get("text"),
                "doc_id": ent.get("doc_id"),
                "creator_id": ent.get("creator_id"),
                "idx": ent.get("idx"),
                "score": float(hit.score) if hasattr(hit, "score") else None
            })
    return out

# ===================== 稠密向量检索 =====================
def naive_search(
    user_id: int, 
    search_text: str, 
    top_k: int = 5
) -> list[dict[str, Any]]:
    embedding_engine = EmbeddingEngine.get_embedding_engine()
    qvec = embedding_engine.embed([search_text])[0].tolist()
    search_params = {
        "anns_field": "embedding",
        "metric_type": "IP",
        "params": {"nprobe": 10}
    }
    results = cast(SearchResult, milvus_client.search(
        collection_name=MILVUS_COLLECTION,
        data=[qvec],
        filter=f"creator_id == {user_id}",
        anns_field="embedding",
        limit=top_k,
        search_params=search_params,
        output_fields=["id", "text", "doc_id", "idx", "creator_id"]
    ))
    return _parse_results(results)

# ===================== 稀疏 BM25 检索 =====================
def full_text_search(user_id: int, search_text: str, top_k: int = 5) -> list[dict[str, Any]]:
    search_params = {
        "anns_field": "sparse",
        "metric_type": "BM25",
        "params": {}
    }
    results = cast(SearchResult, milvus_client.search(
        collection_name=MILVUS_COLLECTION,
        data=[search_text],  # ✅ 注意是原始字符串
        filter=f"creator_id == {user_id}",
        anns_field="sparse",
        limit=top_k,
        search_params=search_params,
        output_fields=["id", "text", "doc_id", "idx", "creator_id"]
    ))
    return _parse_results(results)

def hybrid_search(user_id: int, search_text: str, top_k: int = 5, alpha: float = 0.2) -> list[dict[str, Any]]:
    # 1. 计算 dense 向量
    embedding_engine = EmbeddingEngine.get_embedding_engine()
    qvec = embedding_engine.embed([search_text])[0].tolist()

    # 2. 构造两条搜索请求
    dense_req = AnnSearchRequest(
        data=[qvec],
        anns_field="embedding",
        param={"metric_type": "IP", "params": {"nprobe": 10}},
        limit=top_k,
        expr=f"creator_id == {user_id}"
    )
    sparse_req = AnnSearchRequest(
        data=[search_text],  # Milvus 内部会把 text -> sparse embedding (BM25)
        anns_field="sparse",
        param={"metric_type": "BM25", "params": {}},
        limit=top_k,
        expr=f"creator_id == {user_id}"
    )

    # 3. 统一调用 hybrid_search
    results = cast(SearchResult, milvus_client.hybrid_search(
        collection_name=MILVUS_COLLECTION,
        reqs=[dense_req, sparse_req],
        ranker=WeightedRanker(alpha, 1 - alpha),
        limit=top_k,
        output_fields=["id", "text", "doc_id", "idx", "creator_id"]
    ))

    return _parse_results(results)