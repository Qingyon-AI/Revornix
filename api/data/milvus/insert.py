import asyncio

from data.custom_types.all import ChunkInfo
from data.milvus.base import MILVUS_COLLECTION, milvus_client


async def upsert_milvus(
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

    # 必须是 upsert 而不是 insert：集合 auto_id=False、id 为 VARCHAR 主键，
    # 而 Milvus 的 insert 不做主键去重（实测 v2.5.6：同主键 insert 两次 -> 2 条）。
    # api 侧当前没有调用点，但与 celery-worker 保持同一实现 —— 差异化的拷贝
    # 迟早会被当成"另一个能用的版本"照抄回去。
    await asyncio.to_thread(
        milvus_client.upsert,
        collection_name=MILVUS_COLLECTION,
        data=rows,
    )
