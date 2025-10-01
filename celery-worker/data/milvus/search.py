from typing import cast, Any
from pymilvus.client.search_result import SearchResult
from sentence_transformers import SentenceTransformer
from data.milvus.base import milvus_client, MILVUS_COLLECTION

# 使用与你插入时相同的 embedding model（避免向量不一致）
embedding_model = SentenceTransformer("Qwen/Qwen3-Embedding-0.6B")

# 辅助：把 SearchFuture 兼容为 SearchResult 列表
def _normalize_search_result(results):
    if hasattr(results, "result"):  # SearchFuture
        results = results.result()
    return results

# ===================== Full Text Search =====================
def full_text_search(search_text: str, top_k: int = 5) -> list[dict[str, Any]]:
    """
    使用 Milvus 稀疏检索，适合全文搜索
    返回最相似的 chunk 列表（字典格式）
    """
    qvec = embedding_model.encode(search_text).tolist()

    search_params = {'params': {'drop_ratio_search': 0.2},}
    results = milvus_client.search(collection_name=MILVUS_COLLECTION, 
                                   data=[qvec], 
                                   anns_field='sparse',
                                   limit=top_k, 
                                   search_params=search_params,
                                   output_fields=["id", "text", "doc_id", "idx"])
    results = cast(SearchResult, _normalize_search_result(results))

    out = []
    for hits in results:
        for hit in hits:
            # hit.entity 里是 output_fields 和自定义字段
            ent = hit.entity
            out.append({
                "chunk_id": ent.get("id"),
                "text": ent.get("text"),
                "doc_id": ent.get("doc_id"),
                "idx": ent.get("idx"),
                "score": float(hit.score) if hasattr(hit, "score") else None
            })
    return out

# ===================== Naive Search =====================
def naive_search(search_text: str, top_k: int = 5) -> list[dict[str, Any]]:
    """
    仅使用 Milvus 向量检索（与插入时同样的 embedding model）
    返回最相似的 chunk 列表（字典格式）
    """
    qvec = embedding_model.encode(search_text).tolist()

    search_params = {"metric_type": "IP", "params": {"nprobe": 10}}
    results = milvus_client.search(collection_name=MILVUS_COLLECTION, 
                                   data=[qvec], 
                                   limit=top_k, 
                                   search_params=search_params,
                                   output_fields=["id", "text", "doc_id", "idx"])
    results = cast(SearchResult, _normalize_search_result(results))

    out = []
    for hits in results:
        for hit in hits:
            # hit.entity 里是 output_fields 和自定义字段
            ent = hit.entity
            out.append({
                "chunk_id": ent.get("id"),
                "text": ent.get("text"),
                "doc_id": ent.get("doc_id"),
                "idx": ent.get("idx"),
                "score": float(hit.score) if hasattr(hit, "score") else None
            })
    return out