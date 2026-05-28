from threading import Lock

from pymilvus import MilvusClient

from config.milvus import MILVUS_CLUSTER_ENDPOINT, MILVUS_TOKEN

MILVUS_COLLECTION = "document"

# Bound the worst case when Milvus is unreachable or half-open. Without these
# pymilvus' ``_wait_for_channel_ready`` blocks the worker thread indefinitely
# — every concurrency slot fills up and the worker stops processing anything.
MILVUS_CONNECT_TIMEOUT_SEC = 10
MILVUS_RPC_TIMEOUT_SEC = 30

# RPC-bound methods that hit the Milvus server. Local-only helpers
# (``create_schema``, ``prepare_index_params``) must NOT receive ``timeout``
# — they don't accept it and would raise ``TypeError``.
_MILVUS_RPC_METHODS = frozenset(
    {
        "insert",
        "upsert",
        "delete",
        "search",
        "query",
        "get",
        "flush",
        "load_collection",
        "release_collection",
        "create_collection",
        "drop_collection",
        "has_collection",
        "list_collections",
        "rename_collection",
        "create_index",
        "drop_index",
        "describe_index",
        "list_indexes",
        "compact",
        "create_partition",
        "drop_partition",
        "has_partition",
        "list_partitions",
        "describe_collection",
    }
)

if MILVUS_CLUSTER_ENDPOINT is None or MILVUS_TOKEN is None:
    raise Exception("Please set the environment variables MILVUS_CLUSTER_ENDPOINT and MILVUS_TOKEN")


class _LazyMilvusClient:
    def __init__(self) -> None:
        self._client = None
        self._lock = Lock()

    def _get_client(self):
        if self._client is not None:
            return self._client
        with self._lock:
            if self._client is None:
                self._client = MilvusClient(
                    uri=MILVUS_CLUSTER_ENDPOINT,
                    token=MILVUS_TOKEN,
                    timeout=MILVUS_CONNECT_TIMEOUT_SEC,
                )
        return self._client

    def __getattr__(self, item):
        attr = getattr(self._get_client(), item)
        if item in _MILVUS_RPC_METHODS and callable(attr):
            def _with_default_timeout(*args, __attr=attr, **kwargs):
                kwargs.setdefault("timeout", MILVUS_RPC_TIMEOUT_SEC)
                return __attr(*args, **kwargs)

            return _with_default_timeout
        return attr


milvus_client = _LazyMilvusClient()
