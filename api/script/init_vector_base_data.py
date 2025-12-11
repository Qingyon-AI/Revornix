from dotenv import load_dotenv
load_dotenv(override=True)

from pymilvus import DataType, MilvusClient
from config.milvus import MILVUS_CLUSTER_ENDPOINT, MILVUS_TOKEN

MILVUS_COLLECTION = "document"

if MILVUS_CLUSTER_ENDPOINT is None or MILVUS_TOKEN is None:
    raise ValueError("请设置 Milvus 集群地址和 API 密钥。")

milvus_client = MilvusClient(
    uri=MILVUS_CLUSTER_ENDPOINT,
    token=MILVUS_TOKEN
)

def init_document_collection():
    # ------------------------
    # 1. 如果已存在则删除
    # ------------------------
    if milvus_client.has_collection(MILVUS_COLLECTION):
        print(f"⚠️ Collection `{MILVUS_COLLECTION}` 已存在，正在删除...")
        milvus_client.drop_collection(MILVUS_COLLECTION)
        print(f"✔ 已删除旧的 `{MILVUS_COLLECTION}` collection")

    # ------------------------
    # 2. 创建 schema
    # ------------------------
    schema = milvus_client.create_schema(
        auto_id=True,
        enable_dynamic_fields=True,
    )

    schema.add_field(
        field_name="id",
        datatype=DataType.VARCHAR,
        is_primary=True,
        auto_id=True,
        max_length=100
    )

    schema.add_field(
        field_name="embedding",
        datatype=DataType.FLOAT_VECTOR,
        dim=1024
    )

    schema.add_field(
        field_name="text",
        datatype=DataType.VARCHAR,
        max_length=4000,
        enable_analyzer=True
    )

    schema.add_field(field_name="doc_id", datatype=DataType.INT32)
    schema.add_field(field_name="idx", datatype=DataType.INT64)
    schema.add_field(field_name="creator_id", datatype=DataType.INT64)

    # ------------------------
    # 3. 创建索引
    # ------------------------
    index_params = milvus_client.prepare_index_params()
    index_params.add_index(
        field_name="embedding",
        index_type="IVF_FLAT",
        metric_type="IP",
        index_params={"nlist": 128}
    )

    # ------------------------
    # 4. 创建 collection
    # ------------------------
    milvus_client.create_collection(
        collection_name=MILVUS_COLLECTION,
        schema=schema,
        index_params=index_params,
    )

    print(f"🎉 已成功创建 Milvus Collection `{MILVUS_COLLECTION}`")

if __name__ == "__main__":
    init_document_collection()