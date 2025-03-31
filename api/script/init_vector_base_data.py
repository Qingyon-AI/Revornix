from dotenv import load_dotenv
load_dotenv(override=True)

from pymilvus import DataType
from common.vector import milvus_client

def init_document_collection():
    collection_name = "document"
    
    # Check if the collection already exists
    if milvus_client.has_collection(collection_name):
        print(f"Collection '{collection_name}' already exists. Skipping initialization.")
        return

    # Create schema
    schema = milvus_client.create_schema(
        auto_id=True,
        enable_dynamic_fields=True,
    )
    schema.add_field(field_name="id", datatype=DataType.VARCHAR, is_primary=True, max_length=100, auto_id=True)
    schema.add_field(field_name="category", datatype=DataType.INT32)
    schema.add_field(field_name="text", datatype=DataType.VARCHAR, max_length=4000, enable_analyzer=True)
    schema.add_field(field_name="document_id", datatype=DataType.INT32)
    schema.add_field(field_name="dense", datatype=DataType.FLOAT_VECTOR, dim=768)
    schema.add_field(field_name="sparse", datatype=DataType.SPARSE_FLOAT_VECTOR)

    # Prepare index params
    index_params = milvus_client.prepare_index_params()
    index_params.add_index(
        field_name="dense",
        index_name="dense_index",
        index_type="AUTOINDEX",
        metric_type="IP",
    )
    index_params.add_index(
        field_name="sparse",
        index_name="sparse_index",
        index_type="AUTOINDEX", 
        metric_type="IP"
    )

    # Create collection
    milvus_client.create_collection(
        collection_name=collection_name,
        schema=schema,
        index_params=index_params
    )
    print(f"Collection '{collection_name}' created successfully.")

if __name__ == '__main__':
    init_document_collection()