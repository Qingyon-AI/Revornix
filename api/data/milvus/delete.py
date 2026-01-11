from data.milvus.base import milvus_client, MILVUS_COLLECTION

def clear_milvus_collection():
    if milvus_client.has_collection(MILVUS_COLLECTION): 
        milvus_client.drop_collection(MILVUS_COLLECTION)
        print(f"Milvus collection {MILVUS_COLLECTION} dropped.")

def delete_documents_from_milvus(
    doc_ids: list[int]
):
    """
    从 Milvus collection 中删除指定文档 ID 的所有向量数据
    """
    if not doc_ids:
        return

    # Milvus 删除条件
    expr = f"doc_id in [{','.join(map(str, doc_ids))}]"
    
    milvus_client.delete(
        collection_name="document",
        expr=expr
    )

    # flush 单 collection 版本
    milvus_client.flush("document")
    print(f"Deleted {len(doc_ids)} documents from Milvus")