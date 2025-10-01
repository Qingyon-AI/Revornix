from data.milvus.base import milvus_client, MILVUS_COLLECTION

def clear_milvus_collection():
    if MILVUS_COLLECTION in milvus_client.list_collections():
        milvus_client.drop_collection(MILVUS_COLLECTION)
        print(f"Milvus collection {MILVUS_COLLECTION} dropped.")