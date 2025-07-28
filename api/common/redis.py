import redis
from config.redis import REDIS_URL, REDIS_PORT

async def redis_pool() -> redis.Redis:
    return await redis.asyncio.from_url(url=f"redis://{REDIS_URL}", 
                                        port=REDIS_PORT, 
                                        db=1, 
                                        encoding="utf-8", 
                                        decode_responses=True)