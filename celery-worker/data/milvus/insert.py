import asyncio

from data.custom_types.all import ChunkInfo
from data.milvus.base import milvus_client, MILVUS_COLLECTION


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

    # 必须是 upsert 而不是 insert。集合是 auto_id=False、id 为 VARCHAR 主键，
    # 而 Milvus 的 insert **不做主键去重**：同一主键写两次会存成两条实体
    # （实测 v2.5.6：insert 两次 -> count 2，upsert 两次 -> count 1）。
    #
    # 这一点长期没被发现，是因为按主键 query 只返回一条，看着完全正常 ——
    # 只有 count(*) 或向量检索才看得出多了一份，而多出来那份会作为独立命中
    # 参与召回。写入路径上也没有补偿删除。
    #
    # 幂等性不只是"干净"的问题：celery 配了 task_acks_late，任务在 worker
    # 被杀时会重投，重复执行是**设计内**的。tests_integration 里有一条会红的
    # 断言守着这里。
    await asyncio.to_thread(
        milvus_client.upsert,
        collection_name=MILVUS_COLLECTION,
        data=rows,
    )
