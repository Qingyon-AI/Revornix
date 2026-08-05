from dotenv import find_dotenv, load_dotenv

# usecwd=True 很关键：load_dotenv 默认从**调用方文件所在目录**向上找 .env，
# 而这个模块搬进 app/ 之后，那条路径通向仓库根 —— 那里恰好也有一个 .env，
# 于是它会**静默读到另一份配置**（比找不到更糟）。两个服务都从各自目录启动，
# 按工作目录找才是原来的语义。
load_dotenv(find_dotenv(usecwd=True), override=True)

import redis.asyncio as redis
from redis.asyncio import Redis

from config.redis import REDIS_PORT, REDIS_URL

if not REDIS_URL or not REDIS_PORT:
    raise Exception("REDIS_URL or REDIS_PORT is not set")

async def redis_pool() -> Redis:
    return redis.from_url(
        f"redis://{REDIS_URL}:{REDIS_PORT}/1",
        encoding="utf-8",
        decode_responses=True
    )
