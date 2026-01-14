from dotenv import load_dotenv
load_dotenv(override=True)

import os
import numpy as np
from openai import OpenAI
from numpy.typing import NDArray
from protocol.embedding_engine import EmbeddingEngine

class CloudQwen3EmbeddingEngine(EmbeddingEngine):
    
    def __init__(
        self,
        model: str = "text-embedding-v4",
        dim: int = 1024,
    ):
        if not os.environ.get('ALI_DASHSCOPE_EMBEDDING_API_KEY'):
            raise Exception("Please set ALI_DASHSCOPE_EMBEDDING_API_KEY environment variable")
        
        self.model = model
        self.dim = dim
        
        self.client = OpenAI(
            # 若没有配置环境变量，请用阿里云百炼API Key将下行替换为：api_key="sk-xxx",
            # 新加坡和北京地域的API Key不同。获取API Key：https://help.aliyun.com/zh/model-studio/get-api-key
            api_key=os.environ.get('ALI_DASHSCOPE_EMBEDDING_API_KEY'),
            # 以下是北京地域base-url，如果使用新加坡地域的模型，需要将base_url替换为：https://dashscope-intl.aliyuncs.com/compatible-mode/v1
            base_url="https://dashscope.aliyuncs.com/compatible-mode/v1"
        )


    def embed(self, texts: list[str]) -> NDArray[np.float32]:
        if not texts:
            # 没有 embedding，而不是零向量
            return np.empty((0, self.dim), dtype=np.float32)

        resp = self.client.embeddings.create(
            model=self.model,
            input=texts,
        )

        embeddings = np.array(
            [item.embedding for item in resp.data],
            dtype=np.float32,
        )

        return embeddings
        
if __name__ == "__main__":
    from rich import print
    engine = CloudQwen3EmbeddingEngine()
    print(engine.embed(["你好"]))
    print(engine.embed(["你好", "世界", "不错哦"]))