"""Milvus 集合的建立。

**这个模块必须是幂等的**，因为它跑在 API 的启动路径上（`data/sql/bootstrap.py`），
和建表、补列、种子数据一样：全新安装和升级都只要把服务起起来，不该有人记得去手动
跑什么。

它曾经不是。原来的第一行是 `clear_milvus_collection()` —— 先删整个集合再重建，
那当然不能每次启动都跑。但那行**从来没有生效过**：`clear_milvus_collection` 是
async 的，而这里没有 await，于是只造出一个从未运行的协程（Python 会警告
"coroutine ... was never awaited"，只是没人看日志）。

所以真实行为是"集合已存在时什么也不做"，实测过：重复调用不报错、已写入的向量
条数不变。也就是说它**因为一个 bug 而恰好幂等**了 —— 而一旦有人"修好"那个 await，
就会变成每次启动清空整个向量库。这里把意图写明：存在即跳过，永不删除。

要重建集合（比如改了 schema）请显式调用 `data.milvus.delete.clear_milvus_collection`，
那是一个明确的破坏性操作，不该藏在初始化里。
"""

from pymilvus import DataType, Function, FunctionType

from common.logger import info_logger
from data.milvus.base import MILVUS_COLLECTION, milvus_client

EMBEDDING_DIM = 1024


def ensure_document_collection() -> bool:
    """确保集合存在。返回是否是本次新建的。

    存在就直接返回，**不碰已有数据**。
    """
    if milvus_client.has_collection(MILVUS_COLLECTION):
        return False

    schema = milvus_client.create_schema(
        auto_id=False,
        enable_dynamic_fields=True,
    )
    schema.add_field(field_name="id", datatype=DataType.VARCHAR, is_primary=True, max_length=100)
    schema.add_field(field_name="embedding", datatype=DataType.FLOAT_VECTOR, dim=EMBEDDING_DIM)
    schema.add_field(field_name="text", datatype=DataType.VARCHAR, max_length=8000, enable_analyzer=True)
    schema.add_field(field_name="sparse", datatype=DataType.SPARSE_FLOAT_VECTOR)
    schema.add_field(field_name="doc_id", datatype=DataType.INT32)
    schema.add_field(field_name="idx", datatype=DataType.INT64)
    schema.add_field(field_name="creator_id", datatype=DataType.INT8, max_length=100)

    # BM25：全文检索那一路。稀疏向量由 Milvus 从 text 字段自动生成，
    # 写入侧不需要自己算。
    bm25_function = Function(
        name="text_bm25_emb",
        input_field_names=["text"],
        output_field_names=["sparse"],
        function_type=FunctionType.BM25,
    )
    schema.add_function(bm25_function)

    index_params = milvus_client.prepare_index_params()
    index_params.add_index(
        field_name="embedding",
        index_type="IVF_FLAT",
        metric_type="IP",
        index_params={"nlist": 128},
    )
    index_params.add_index(
        field_name="sparse",
        index_type="SPARSE_INVERTED_INDEX",
        metric_type="BM25",
        params={
            "inverted_index_algo": "DAAT_MAXSCORE",
            "bm25_k1": 1.2,
            "bm25_b": 0.75,
        },
    )

    milvus_client.create_collection(
        collection_name=MILVUS_COLLECTION,
        schema=schema,
        index_params=index_params,
    )
    info_logger.info(f"Milvus collection {MILVUS_COLLECTION} created")
    return True


# 旧名字。曾经是"先删后建"，现在指向幂等版本 —— 保留是为了不打断既有调用点，
# 但新代码请直接用 ensure_document_collection。
init_document_collection = ensure_document_collection


if __name__ == "__main__":
    created = ensure_document_collection()
    print("collection created" if created else "collection already exists, nothing to do")
