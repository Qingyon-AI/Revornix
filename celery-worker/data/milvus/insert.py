from data.custom_types.all import ChunkInfo
from data.milvus.base import milvus_client, MILVUS_COLLECTION

def upsert_milvus(chunks_info: list[ChunkInfo]):
    """
    chunks_info: [{ "id": str, "embedding": list, "text": str, "doc_id": int, "idx": int}]
    """
    data = [
        {
            "id": c.id,
            "embedding": c.embedding,
            "text": c.text,
            "doc_id": c.doc_id,
            "idx": c.idx
        }
        for c in chunks_info
    ]
    milvus_client.insert(collection_name=MILVUS_COLLECTION, data=data)