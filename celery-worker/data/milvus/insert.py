from data.custom_types.all import ChunkInfo
from data.milvus.base import milvus_client, MILVUS_COLLECTION


def upsert_milvus(
    user_id: int,
    chunks_info: list[ChunkInfo]
):
    """
    chunks_info: [{ "id": str, "embedding": list, "text": str, "doc_id": int, "idx": int }]
    """
    if not chunks_info:
        return

    rows = []
    for c in chunks_info:
        rows.append({
            "id": c.id,
            "embedding": c.embedding,
            "text": c.text,
            "doc_id": c.doc_id,
            "creator_id": user_id,
            "idx": c.idx,
        })

    milvus_client.insert(collection_name=MILVUS_COLLECTION, data=rows)
