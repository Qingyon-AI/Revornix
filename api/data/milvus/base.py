import os
from dotenv import load_dotenv
if os.environ.get('ENV') == 'dev':
    load_dotenv(override=True)
    
from pymilvus import MilvusClient
from config.milvus import MILVUS_CLUSTER_ENDPOINT, MILVUS_TOKEN

MILVUS_COLLECTION = "document"

if MILVUS_CLUSTER_ENDPOINT is None or MILVUS_TOKEN is None:
    raise ValueError("请设置 Milvus 集群地址和 API 密钥。")

milvus_client = MilvusClient(
    uri=MILVUS_CLUSTER_ENDPOINT, # Cluster endpoint obtained from the console
    token=MILVUS_TOKEN # API key or a colon-separated cluster username and password
)