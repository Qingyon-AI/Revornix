from dotenv import load_dotenv
load_dotenv(override=True)

from pymilvus import MilvusClient
from config.milvus import MILVUS_CLUSTER_ENDPOINT, MILVUS_TOKEN

MILVUS_COLLECTION = "document"

if MILVUS_CLUSTER_ENDPOINT is None or MILVUS_TOKEN is None:
    raise Exception("Please set the environment variables MILVUS_CLUSTER_ENDPOINT and MILVUS_TOKEN")

milvus_client = MilvusClient(
    uri=MILVUS_CLUSTER_ENDPOINT, # Cluster endpoint obtained from the console
    token=MILVUS_TOKEN # API key or a colon-separated cluster username and password
)
