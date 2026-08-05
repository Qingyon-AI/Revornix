import asyncio
from typing import cast, Any
from pymilvus.client.search_result import SearchResult
from common.embedding_utils import extract_single_embedding_vector
from engine.embedding.factory import get_embedding_engine
from data.milvus.base import milvus_client, MILVUS_COLLECTION

def _normalize_search_result(
    results
):
    """Unwrap async-like Milvus search futures into concrete results."""
    if hasattr(results, "result"):  # SearchFuture
        results = results.result()
    return results

def _parse_results(
    results: SearchResult
) -> list[dict[str, Any]]:
    """Convert Milvus search hits into the chunk payload format used by the app."""
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
    """Build a Milvus filter that restricts search results to a document id set."""
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
    """Run dense vector search across all chunks owned by the target user."""
    embedding_engine = get_embedding_engine()
    qvec = extract_single_embedding_vector(await embedding_engine.embed([search_text]))
    search_params = {
        "anns_field": "embedding",
        "metric_type": "IP",
        "params": {"nprobe": 10}
    }
    results = cast(SearchResult, await asyncio.to_thread(
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
        ]
    ))
    return _parse_results(results)


async def public_naive_search(
    search_text: str,
    top_k: int = 20,
) -> list[dict[str, Any]]:
    """Run dense vector search across all chunks regardless of creator.

    Used for the public/SEO global search. Callers MUST post-filter the
    returned doc_ids against the set of currently-published documents before
    exposing any results to unauthenticated users.
    """
    embedding_engine = get_embedding_engine()
    qvec = extract_single_embedding_vector(await embedding_engine.embed([search_text]))
    search_params = {
        "anns_field": "embedding",
        "metric_type": "IP",
        "params": {"nprobe": 10}
    }
    results = cast(SearchResult, await asyncio.to_thread(
        milvus_client.search,
        collection_name=MILVUS_COLLECTION,
        data=[qvec],
        anns_field="embedding",
        limit=top_k,
        search_params=search_params,
        output_fields=[
            "id",
            "text",
            "doc_id",
            "idx",
            "creator_id",
        ]
    ))
    return _parse_results(results)


async def naive_search_for_documents(
    *,
    search_text: str,
    document_ids: list[int],
    top_k: int = 5,
) -> list[dict[str, Any]]:
    """Run dense vector search limited to a specific document id list."""
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
            ]
        )
    )
    return _parse_results(results)

# ===================== 稀疏 BM25 检索 =====================
async def full_text_search(
    user_id: int,
    search_text: str,
    top_k: int = 5
) -> list[dict[str, Any]]:
    """Run sparse BM25 search across all chunks owned by the target user."""
    search_params = {
        "anns_field": "sparse",
        "metric_type": "BM25",
        "params": {}
    }
    results = cast(SearchResult, await asyncio.to_thread(
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
        ]
    ))
    return _parse_results(results)


async def public_full_text_search(
    search_text: str,
    top_k: int = 20,
) -> list[dict[str, Any]]:
    """Public BM25 search (no creator_id filter). Caller MUST post-filter to
    published documents before exposing results."""
    search_params = {
        "anns_field": "sparse",
        "metric_type": "BM25",
        "params": {}
    }
    results = cast(SearchResult, await asyncio.to_thread(
        milvus_client.search,
        collection_name=MILVUS_COLLECTION,
        data=[search_text],
        anns_field="sparse",
        limit=top_k,
        search_params=search_params,
        output_fields=[
            "id",
            "text",
            "doc_id",
            "idx",
            "creator_id",
        ]
    ))
    return _parse_results(results)


# ===================== 混合检索（RRF 融合 dense + BM25） =====================
def _reciprocal_rank_fusion(
    rankings: list[list[dict[str, Any]]],
    k: int = 60,
) -> dict[int, dict[str, Any]]:
    """RRF aggregation at the chunk level. Returns the best chunk per doc_id
    keyed by doc_id, with the fused RRF score plus the chunk text for snippet
    rendering. The selected chunk is the one with the largest individual rank
    contribution among all chunks of that doc."""
    chunk_scores: dict[int, dict[str, Any]] = {}  # chunk_id -> chunk + fused_score
    for ranking in rankings:
        for rank, chunk in enumerate(ranking):
            chunk_id = cast(int, chunk.get("chunk_id"))
            if chunk_id is None:
                continue
            entry = chunk_scores.get(chunk_id)
            contribution = 1.0 / (k + rank + 1)
            if entry is None:
                chunk_scores[chunk_id] = {**chunk, "fused_score": contribution}
            else:
                entry["fused_score"] = entry.get("fused_score", 0.0) + contribution

    # Group chunks by doc, keep the best-fused-score chunk as the doc's
    # representative (carries snippet + score).
    doc_best: dict[int, dict[str, Any]] = {}
    for chunk in chunk_scores.values():
        doc_id = cast(int, chunk.get("doc_id"))
        if doc_id is None:
            continue
        current = doc_best.get(doc_id)
        if current is None or chunk["fused_score"] > current["fused_score"]:
            doc_best[doc_id] = chunk
    return doc_best


def _drop_low_score_tail(
    ordered: list[dict[str, Any]],
    *,
    relative_threshold: float = 0.25,
) -> list[dict[str, Any]]:
    """Trim the long tail of weak hits relative to the top result. RRF scores
    are tiny (1/(60+rank)) and unbounded by relevance, so an absolute cutoff
    is meaningless. Instead, drop anything whose score is < threshold * top.
    """
    if not ordered:
        return ordered
    top_score = ordered[0].get("fused_score", 0.0)
    if top_score <= 0:
        return ordered
    cutoff = top_score * relative_threshold
    return [item for item in ordered if item.get("fused_score", 0.0) >= cutoff]


async def hybrid_search(
    *,
    user_id: int,
    search_text: str,
    top_k: int = 10,
    candidate_pool: int | None = None,
) -> list[dict[str, Any]]:
    """Hybrid retrieval combining dense ANN and BM25 via RRF. Returns at most
    `top_k` doc-level results sorted by fused score descending. Each item
    carries `doc_id`, `score` (fused), and `text` (best chunk for snippet)."""
    pool = candidate_pool or max(top_k * 5, 20)
    dense_task = naive_search(user_id=user_id, search_text=search_text, top_k=pool)
    sparse_task = full_text_search(user_id=user_id, search_text=search_text, top_k=pool)
    dense, sparse = await asyncio.gather(dense_task, sparse_task)
    fused = _reciprocal_rank_fusion([dense, sparse])
    ordered = sorted(fused.values(), key=lambda c: c["fused_score"], reverse=True)
    return _drop_low_score_tail(ordered)[:top_k]


async def public_hybrid_search(
    *,
    search_text: str,
    top_k: int = 10,
    candidate_pool: int | None = None,
) -> list[dict[str, Any]]:
    """Hybrid retrieval for public/SEO scope. No creator filter — callers MUST
    post-filter to published documents."""
    pool = candidate_pool or max(top_k * 5, 20)
    dense_task = public_naive_search(search_text=search_text, top_k=pool)
    sparse_task = public_full_text_search(search_text=search_text, top_k=pool)
    dense, sparse = await asyncio.gather(dense_task, sparse_task)
    fused = _reciprocal_rank_fusion([dense, sparse])
    ordered = sorted(fused.values(), key=lambda c: c["fused_score"], reverse=True)
    return _drop_low_score_tail(ordered)[:top_k]
