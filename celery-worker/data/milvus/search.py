from typing import cast, Any
from pymilvus.client.search_result import SearchResult
from embedding.qwen import get_embedding_model
from data.milvus.base import milvus_client, MILVUS_COLLECTION

embedding_model = get_embedding_model()

def _normalize_search_result(
    results
):
    if hasattr(results, "result"):  # SearchFuture
        results = results.result()
    return results

def _parse_results(
    results: SearchResult
) -> list[dict[str, Any]]:
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
    qvec = embedding_model.encode(search_text).tolist()
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
def full_text_search(
    user_id: int, 
    search_text: str, 
    top_k: int = 5
) -> list[dict[str, Any]]:
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