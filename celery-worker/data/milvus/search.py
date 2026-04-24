import asyncio
from typing import cast, Any
from pymilvus.client.search_result import SearchResult
from common.embedding_utils import extract_single_embedding_vector
from engine.embedding.factory import get_embedding_engine
from data.milvus.base import milvus_client, MILVUS_COLLECTION

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


def _build_document_filter(document_ids: list[int]) -> str:
    normalized_document_ids = sorted({int(document_id) for document_id in document_ids})
    if not normalized_document_ids:
        return "doc_id == -1"
    if len(normalized_document_ids) == 1:
        return f"doc_id == {normalized_document_ids[0]}"
    joined_document_ids = ", ".join(str(document_id) for document_id in normalized_document_ids)
    return f"doc_id in [{joined_document_ids}]"

# ===================== 稠密向量检索 =====================
async def naive_search(
    user_id: int, 
    search_text: str, 
    top_k: int = 5
) -> list[dict[str, Any]]:
    embedding_engine = get_embedding_engine()
    qvec = extract_single_embedding_vector(await embedding_engine.embed([search_text]))
    search_params = {
        "anns_field": "embedding",
        "metric_type": "IP",
        "params": {"nprobe": 10}
    }
    results = cast(
        SearchResult,
        await asyncio.to_thread(
            milvus_client.search,
            collection_name=MILVUS_COLLECTION,
            data=[qvec],
            filter=f"creator_id == {user_id}",
            anns_field="embedding",
            limit=top_k,
            search_params=search_params,
            output_fields=[
                "id",
                "text",
                "doc_id",
                "idx",
                "creator_id",
            ],
        ),
    )
    return _parse_results(results)


async def naive_search_for_documents(
    *,
    search_text: str,
    document_ids: list[int],
    top_k: int = 5,
) -> list[dict[str, Any]]:
    if not document_ids:
        return []

    embedding_engine = get_embedding_engine()
    qvec = extract_single_embedding_vector(await embedding_engine.embed([search_text]))
    search_params = {
        "anns_field": "embedding",
        "metric_type": "IP",
        "params": {"nprobe": 10}
    }
    results = cast(
        SearchResult,
        await asyncio.to_thread(
            milvus_client.search,
            collection_name=MILVUS_COLLECTION,
            data=[qvec],
            filter=_build_document_filter(document_ids),
            anns_field="embedding",
            limit=top_k,
            search_params=search_params,
            output_fields=[
                "id",
                "text",
                "doc_id",
                "idx",
                "creator_id",
            ],
        ),
    )
    return _parse_results(results)

# ===================== 稀疏 BM25 检索 =====================
async def full_text_search(
    user_id: int, 
    search_text: str, 
    top_k: int = 5
) -> list[dict[str, Any]]:
    search_params = {
        "anns_field": "sparse",
        "metric_type": "BM25",
        "params": {}
    }
    results = cast(
        SearchResult,
        await asyncio.to_thread(
            milvus_client.search,
            collection_name=MILVUS_COLLECTION,
            data=[search_text],
            filter=f"creator_id == {user_id}",
            anns_field="sparse",
            limit=top_k,
            search_params=search_params,
            output_fields=[
                "id",
                "text",
                "doc_id",
                "idx",
                "creator_id",
            ],
        ),
    )
    return _parse_results(results)
