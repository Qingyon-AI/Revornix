import numpy as np
from numpy.typing import NDArray


class EmbeddingEngineBase:

    def embed(self, texts: list[str]) -> NDArray[np.float32]:
        raise NotImplementedError("EmbeddingEngine is an abstract class")
