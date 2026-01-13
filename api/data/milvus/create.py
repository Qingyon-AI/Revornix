from data.milvus.delete import clear_milvus_collection
from data.milvus.base import milvus_client
from pymilvus import DataType, Function, FunctionType
from common.logger import info_logger

def init_document_collection():
    clear_milvus_collection()
    schema = milvus_client.create_schema(
        auto_id=False,
        enable_dynamic_fields=True,
    )
    schema.add_field(field_name="id", datatype=DataType.VARCHAR, is_primary=True, max_length=100)
    schema.add_field(field_name="embedding", datatype=DataType.FLOAT_VECTOR, dim=1024)
    schema.add_field(field_name="text", datatype=DataType.VARCHAR, max_length=8000, enable_analyzer=True)
    schema.add_field(field_name="sparse", datatype=DataType.SPARSE_FLOAT_VECTOR)
    schema.add_field(field_name="doc_id", datatype=DataType.INT32)
    schema.add_field(field_name="idx", datatype=DataType.INT64)
    schema.add_field(field_name="creator_id", datatype=DataType.INT8, max_length=100)
    
    bm25_function = Function(
        name="text_bm25_emb", # Function name
        input_field_names=["text"], # Name of the VARCHAR field containing raw text data
        output_field_names=["sparse"], # Name of the SPARSE_FLOAT_VECTOR field reserved to store generated embeddings
        function_type=FunctionType.BM25, # Set to `BM25`
    )

    schema.add_function(bm25_function)

    index_params = milvus_client.prepare_index_params()
    index_params.add_index(
        field_name="embedding",
        index_type="IVF_FLAT",
        metric_type="IP",
        index_params={"nlist": 128}
    )
    index_params.add_index(
        field_name="sparse",
        index_type="SPARSE_INVERTED_INDEX",
        metric_type="BM25",
        params={
            "inverted_index_algo": "DAAT_MAXSCORE",
            "bm25_k1": 1.2,
            "bm25_b": 0.75
        }
    )

    milvus_client.create_collection(
        collection_name="document",
        schema=schema,
        index_params=index_params
    )
    info_logger.info('Milvus collection created')

if __name__ == "__main__":
    init_document_collection()