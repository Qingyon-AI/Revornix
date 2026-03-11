import type { Get, Post } from "../types.js";
import { config } from "../config.js";
import { getCache, setCache, delCache } from "./cache.js";
import logger from "./logger.js";
import axios from "axios";

const VOLATILE_CACHE_FIELDS = new Set([
  "_",
  "sign",
  "timestamp",
  "token",
  "w_rid",
  "wts",
]);

const normalizeCacheValue = (value: unknown): unknown => {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (Buffer.isBuffer(value)) {
    return {
      __type: "buffer",
      data: value.toString("base64"),
    };
  }
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map((item) => normalizeCacheValue(item));
  if (typeof value === "object") {
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((accumulator, key) => {
        if (VOLATILE_CACHE_FIELDS.has(key)) return accumulator;
        const normalizedValue = normalizeCacheValue(
          (value as Record<string, unknown>)[key],
        );
        if (normalizedValue !== undefined) {
          accumulator[key] = normalizedValue;
        }
        return accumulator;
      }, {});
  }
  return value;
};

const buildRequestCacheKey = ({
  method,
  url,
  params,
  body,
  originaInfo,
  responseType,
}: {
  method: "GET" | "POST";
  url: string;
  params?: Record<string, string | number>;
  body?: string | object | Buffer;
  originaInfo?: boolean;
  responseType?: string;
}) => {
  return [
    "request",
    method,
    url,
    JSON.stringify(normalizeCacheValue(params) ?? null),
    JSON.stringify(normalizeCacheValue(body) ?? null),
    originaInfo ? "raw" : "data",
    responseType ?? "json",
  ].join(":");
};

// 基础配置
const request = axios.create({
  // 请求超时设置
  timeout: config.REQUEST_TIMEOUT,
  withCredentials: true,
});

// 请求拦截
request.interceptors.request.use(
  (request) => {
    if (!request.params) request.params = {};
    // 发送请求
    return request;
  },
  (error) => {
    logger.error("❌ [ERROR] request failed");
    return Promise.reject(error);
  },
);

// 响应拦截
request.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // 继续传递错误
    return Promise.reject(error);
  },
);

// GET
export const get = async (options: Get) => {
  const {
    url,
    headers,
    params,
    noCache,
    ttl = config.CACHE_TTL,
    originaInfo = false,
    responseType = "json",
  } = options;
  logger.info(`🌐 [GET] ${url}`);
  try {
    const cacheKey = buildRequestCacheKey({
      method: "GET",
      url,
      params,
      originaInfo,
      responseType,
    });
    // 检查缓存
    if (noCache) await delCache(cacheKey);
    else {
      const cachedData = await getCache(cacheKey);
      if (cachedData) {
        logger.info("💾 [CHCHE] The request is cached");
        return {
          fromCache: true,
          updateTime: cachedData.updateTime,
          data: cachedData.data,
        };
      }
    }
    // 缓存不存在时请求接口
    const response = await request.get(url, { headers, params, responseType });
    const responseData = response?.data || response;
    // 存储新获取的数据到缓存
    const updateTime = new Date().toISOString();
    const data = originaInfo ? response : responseData;
    await setCache(cacheKey, { data, updateTime }, ttl);
    // 返回数据
    logger.info(`✅ [${response?.status}] request was successful`);
    return { fromCache: false, updateTime, data };
  } catch (error) {
    logger.error("❌ [ERROR] request failed");
    throw error;
  }
};

// POST
export const post = async (options: Post) => {
  const { url, headers, body, noCache, ttl = config.CACHE_TTL, originaInfo = false } = options;
  logger.info(`🌐 [POST] ${url}`);
  try {
    const cacheKey = buildRequestCacheKey({
      method: "POST",
      url,
      body,
      originaInfo,
    });
    // 检查缓存
    if (noCache) await delCache(cacheKey);
    else {
      const cachedData = await getCache(cacheKey);
      if (cachedData) {
        logger.info("💾 [CHCHE] The request is cached");
        return { fromCache: true, updateTime: cachedData.updateTime, data: cachedData.data };
      }
    }
    // 缓存不存在时请求接口
    const response = await request.post(url, body, { headers });
    const responseData = response?.data || response;
    // 存储新获取的数据到缓存
    const updateTime = new Date().toISOString();
    const data = originaInfo ? response : responseData;
    if (!noCache) {
      await setCache(cacheKey, { data, updateTime }, ttl);
    }
    // 返回数据
    logger.info(`✅ [${response?.status}] request was successful`);
    return { fromCache: false, updateTime, data };
  } catch (error) {
    logger.error("❌ [ERROR] request failed");
    throw error;
  }
};
