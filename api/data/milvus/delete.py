from data.milvus.base import milvus_client, MILVUS_COLLECTION

def clear_milvus_collection():
    if milvus_client.has_collection(MILVUS_COLLECTION): 
        milvus_client.drop_collection(MILVUS_COLLECTION)
        print(f"Milvus collection {MILVUS_COLLECTION} dropped.")