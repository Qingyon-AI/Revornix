from pymilvus import DataType, MilvusClient
from config.milvus import MILVUS_CLUSTER_ENDPOINT, MILVUS_TOKEN

MILVUS_COLLECTION = "document"

if MILVUS_CLUSTER_ENDPOINT is None or MILVUS_TOKEN is None:
    raise ValueError("请设置 Milvus 集群地址和 API 密钥。")

milvus_client = MilvusClient(
    uri=MILVUS_CLUSTER_ENDPOINT, # Cluster endpoint obtained from the console
    token=MILVUS_TOKEN # API key or a colon-separated cluster username and password
)

def init_document_collection():
    schema = milvus_client.create_schema(
        auto_id=True,
        enable_dynamic_fields=True,
    )
    schema.add_field(field_name="id", datatype=DataType.VARCHAR, is_primary=True, max_length=100, auto_id=True)
    schema.add_field(field_name="embedding", datatype=DataType.FLOAT_VECTOR, dim=1024)
    schema.add_field(field_name="text", datatype=DataType.VARCHAR, max_length=4000, enable_analyzer=True)
    schema.add_field(field_name="doc_id", datatype=DataType.INT32)
    schema.add_field(field_name="idx", datatype=DataType.INT64)

    index_params = milvus_client.prepare_index_params()
    index_params.add_index(
        field_name="embedding",
        index_type="IVF_FLAT",
        metric_type="IP",
        index_params={"nlist": 128}
    )
    milvus_client.create_collection(
        collection_name="document",
        schema=schema,
        index_params=index_params
    )

if __name__ == "__main__":
    init_document_collection()