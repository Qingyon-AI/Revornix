from dotenv import load_dotenv
load_dotenv(override=True)

import os

def get_embedding_engine():
    if os.getenv("ALI_DASHSCOPE_EMBEDDING_ON") == "True":
        from engine.embedding.qwen_cloud import CloudQwen3EmbeddingEngine
        return CloudQwen3EmbeddingEngine()
    else:
        from engine.embedding.qwen_local import LocalQwen3EmbeddingEngine
        return LocalQwen3EmbeddingEngine()
