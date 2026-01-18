from dotenv import load_dotenv

load_dotenv(override=True)

import os

from engine.embedding.qwen_cloud import CloudQwen3EmbeddingEngine
from engine.embedding.qwen_local import LocalQwen3EmbeddingEngine


def get_embedding_engine():
    if os.getenv("ALI_DASHSCOPE_EMBEDDING_ON") == "True":
        return CloudQwen3EmbeddingEngine()
    else:
        return LocalQwen3EmbeddingEngine()
