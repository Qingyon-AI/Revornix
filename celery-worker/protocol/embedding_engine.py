from dotenv import load_dotenv
load_dotenv(override=True)

import os
import numpy as np
from engine.embedding.qwen_cloud import CloudQwen3EmbeddingEngine
from engine.embedding.qwen_local import LocalQwen3EmbeddingEngine
from numpy.typing import NDArray

class EmbeddingEngine():
    
    @staticmethod
    def get_embedding_engine():
        if os.getenv("ALI_DASHSCOPE_EMBEDDING_ON") == "True":
            return CloudQwen3EmbeddingEngine()
        else:
            return LocalQwen3EmbeddingEngine()
    
    def embed(self, texts: list[str]) -> NDArray[np.float32]:
        raise NotImplementedError("EmbeddingEngine is an abstract class")