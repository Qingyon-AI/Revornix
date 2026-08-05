from dotenv import find_dotenv, load_dotenv

# usecwd=True 很关键：load_dotenv 默认从**调用方文件所在目录**向上找 .env，
# 而这个模块搬进 app/ 之后，那条路径通向仓库根 —— 那里恰好也有一个 .env，
# 于是它会**静默读到另一份配置**（比找不到更糟）。两个服务都从各自目录启动，
# 按工作目录找才是原来的语义。
load_dotenv(find_dotenv(usecwd=True), override=True)

import os

import numpy as np
from numpy.typing import NDArray
from openai import AsyncOpenAI

from base_implement.embedding_engine_base import EmbeddingEngineBase


class CloudQwen3EmbeddingEngine(EmbeddingEngineBase):

    def __init__(
        self,
        model: str = "text-embedding-v4",
        dim: int = 1024,
    ):
        if not os.environ.get('ALI_DASHSCOPE_EMBEDDING_API_KEY'):
            raise Exception("Please set ALI_DASHSCOPE_EMBEDDING_API_KEY environment variable")

        self.model = model
        self.dim = dim

        self.client = AsyncOpenAI(
            # 若没有配置环境变量，请用阿里云百炼API Key将下行替换为：api_key="sk-xxx",
            # 新加坡和北京地域的API Key不同。获取API Key：https://help.aliyun.com/zh/model-studio/get-api-key
            api_key=os.environ.get('ALI_DASHSCOPE_EMBEDDING_API_KEY'),
            # 以下是北京地域base-url，如果使用新加坡地域的模型，需要将base_url替换为：https://dashscope-intl.aliyuncs.com/compatible-mode/v1
            base_url="https://dashscope.aliyuncs.com/compatible-mode/v1"
        )


    async def embed(self, texts: list[str]) -> NDArray[np.float32]:
        if not texts:
            # 没有 embedding，而不是零向量
            return np.empty((0, self.dim), dtype=np.float32)

        resp = await self.client.embeddings.create(
            model=self.model,
            input=texts,
        )

        return np.array(
            [item.embedding for item in resp.data],
            dtype=np.float32,
        )

if __name__ == "__main__":
    import asyncio
    from rich import print
    engine = CloudQwen3EmbeddingEngine()
    print(asyncio.run(engine.embed(["你好"])))
    print(asyncio.run(engine.embed(["你好", "世界", "不错哦"])))
