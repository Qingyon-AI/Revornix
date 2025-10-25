import os
from redis.asyncio import Redis

async def redis_pool() -> Redis:
    return await Redis(host=f"redis://{os.environ.get('REDIS_URL')}", 
                       port=int(os.environ.get('REDIS_PORT')), 
                       db=1, 
                       encoding="utf-8", 
                       decode_responses=True)