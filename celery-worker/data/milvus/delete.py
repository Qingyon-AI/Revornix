import asyncio

from data.milvus.base import milvus_client, MILVUS_COLLECTION
from common.logger import info_logger

async def clear_milvus_collection():
    if await asyncio.to_thread(milvus_client.has_collection, MILVUS_COLLECTION):
        await asyncio.to_thread(milvus_client.drop_collection, MILVUS_COLLECTION)
        info_logger.info(f"Milvus collection {MILVUS_COLLECTION} dropped.")

async def delete_documents_from_milvus(
    doc_ids: list[int]
):
    """
    从 Milvus collection 中删除指定文档 ID 的所有向量数据
    """
    if not doc_ids:
        return

    # Milvus 删除条件
    expr = f"doc_id in [{','.join(map(str, doc_ids))}]"
    
    await asyncio.to_thread(
        milvus_client.delete,
        collection_name="document",
        filter=expr,
    )

    await asyncio.to_thread(milvus_client.flush, "document")
    info_logger.info(f"Deleted {len(doc_ids)} documents from Milvus")
