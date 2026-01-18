from dotenv import load_dotenv

load_dotenv(override=True)

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
