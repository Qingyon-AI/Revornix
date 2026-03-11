import { config } from "../config.js";
import { stringify, parse } from "flatted";
import logger from "./logger.js";
import NodeCache from "node-cache";
import Redis from "ioredis";

interface CacheData {
  updateTime: string;
  data: unknown;
}

// init NodeCache
const cache = new NodeCache({
  // 缓存过期时间（ 秒 ）
  stdTTL: config.CACHE_TTL,
  // 定期检查过期缓存（ 秒 ）
  checkperiod: 600,
  // 克隆变量
  useClones: false,
  // 最大键值对
  maxKeys: 100,
});

// init Redis client
const redis = new Redis({
  host: config.REDIS_HOST,
  port: config.REDIS_PORT,
  password: config.REDIS_PASSWORD,
  maxRetriesPerRequest: 5,
  // 重试策略：最小延迟 50ms，最大延迟 2s
  retryStrategy: (times) => Math.min(times * 50, 2000),
  // 仅在第一次建立连接
  lazyConnect: true,
});

const REDIS_RETRY_DELAY_MS = 5000;

let isRedisAvailable: boolean = false;
let nextRedisRetryAt = 0;

// Redis 连接状态
const ensureRedisConnection = async (): Promise<boolean> => {
  if (redis.status === "ready") {
    isRedisAvailable = true;
    nextRedisRetryAt = 0;
    return true;
  }

  const now = Date.now();
  if (now < nextRedisRetryAt) return false;

  try {
    await redis.ping();
    isRedisAvailable = true;
    nextRedisRetryAt = 0;
    logger.info("📦 [Redis] connected successfully.");
    return true;
  } catch (error) {
    isRedisAvailable = false;
    nextRedisRetryAt = now + REDIS_RETRY_DELAY_MS;
    logger.error(
      `📦 [Redis] connection failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
    return false;
  }
};

// Redis 事件监听
redis.on("error", () => {
  isRedisAvailable = false;
});

redis.on("close", () => {
  isRedisAvailable = false;
});

redis.on("end", () => {
  isRedisAvailable = false;
});

// NodeCache 事件监听
cache.on("expired", (key) => {
  logger.info(`⏳ [NodeCache] Key "${key}" has expired.`);
});

cache.on("del", (key) => {
  logger.info(`🗑️ [NodeCache] Key "${key}" has been deleted.`);
});

/**
 * 从缓存中获取数据
 * @param key 缓存键
 * @returns 缓存数据
 */
export const getCache = async (key: string): Promise<CacheData | undefined> => {
  const redisReady = await ensureRedisConnection();
  if (redisReady) {
    try {
      const redisResult = await redis.get(key);
      if (redisResult) return parse(redisResult);
    } catch (error) {
      logger.error(
        `📦 [Redis] get error: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }
  return cache.get(key);
};

/**
 * 将数据写入缓存
 * @param key 缓存键
 * @param value 缓存值
 * @param ttl 缓存过期时间（ 秒 ）
 * @returns 是否写入成功
 */
export const setCache = async (
  key: string,
  value: CacheData,
  ttl: number = config.CACHE_TTL,
): Promise<boolean> => {
  const redisReady = await ensureRedisConnection();
  // 尝试写入 Redis
  if (redisReady && !Buffer.isBuffer(value?.data)) {
    try {
      await redis.set(key, stringify(value), "EX", ttl);
      if (logger) logger.info(`💾 [REDIS] ${key} has been cached`);
    } catch (error) {
      logger.error(
        `📦 [Redis] set error: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }
  const success = cache.set(key, value, ttl);
  if (logger) logger.info(`💾 [NodeCache] ${key} has been cached`);
  return success;
};

/**
 * 从缓存中删除数据
 * @param key 缓存键
 * @returns 是否删除成功
 */
export const delCache = async (key: string): Promise<boolean> => {
  let redisSuccess = true;
  const redisReady = await ensureRedisConnection();
  if (redisReady) {
    try {
      await redis.del(key);
      logger.info(`🗑️ [REDIS] ${key} has been deleted from Redis`);
    } catch (error) {
      redisSuccess = false;
      logger.error(
        `📦 [Redis] del error: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }
  // 尝试删除 NodeCache
  const nodeCacheSuccess = cache.del(key) > 0;
  if (logger) logger.info(`🗑️ [CACHE] ${key} has been deleted from NodeCache`);
  return redisSuccess && nodeCacheSuccess;
};
