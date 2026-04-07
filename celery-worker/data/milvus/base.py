from threading import Lock

from pymilvus import MilvusClient

from config.milvus import MILVUS_CLUSTER_ENDPOINT, MILVUS_TOKEN

MILVUS_COLLECTION = "document"

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
                )
        return self._client

    def __getattr__(self, item):
        return getattr(self._get_client(), item)


milvus_client = _LazyMilvusClient()
