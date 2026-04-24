import numpy as np
import asyncio
import torch
from numpy.typing import NDArray
from sentence_transformers import SentenceTransformer

from base_implement.embedding_engine_base import EmbeddingEngineBase

_model = None

def get_device() -> str:
    if torch.cuda.is_available():
        return "cuda"
    elif torch.backends.mps.is_available():
        return "mps"
    else:
        return "cpu"

def get_embedding_model() -> SentenceTransformer:
    global _model
    if _model is None:
        _model = SentenceTransformer(
            "Qwen/Qwen3-Embedding-0.6B",
            device=get_device()
        )
    return _model

class LocalQwen3EmbeddingEngine(EmbeddingEngineBase):
    def __init__(self, dim: int = 1024):
        self.model = get_embedding_model()
        self.dim = dim

    @torch.inference_mode()
    def _embed_sync(self, texts: list[str]) -> NDArray[np.float32]:
        if not texts:
            return np.empty((0, self.dim), dtype=np.float32)

        embeddings = self.model.encode(
            sentences=texts,
            convert_to_numpy=True,
            normalize_embeddings=True
        )
        return embeddings.astype("float32")

    async def embed(self, texts: list[str]) -> NDArray[np.float32]:
        return await asyncio.to_thread(self._embed_sync, texts)

if __name__ == "__main__":
    engine = LocalQwen3EmbeddingEngine()
    import asyncio
    from rich import print
    print(asyncio.run(engine.embed(["hello", "world"])))
