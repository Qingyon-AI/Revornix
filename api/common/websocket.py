import asyncio
import os
from inspect import isawaitable
from collections import defaultdict, deque
from typing import Any, Awaitable, TypeVar, cast

from fastapi import WebSocket

from common.logger import exception_logger, format_log_message, info_logger
from common.redis import redis_pool


def _read_int_env(env_name: str, default_value: int) -> int:
    raw_value = os.getenv(env_name)
    if raw_value is None:
        return default_value
    try:
        return int(raw_value)
    except ValueError:
        exception_logger.error(
            format_log_message(
                "websocket_env_invalid",
                env_name=env_name,
                raw_value=raw_value,
                fallback=default_value,
            )
        )
        return default_value


WS_OFFLINE_CACHE_TTL_SECONDS = _read_int_env("WS_OFFLINE_CACHE_TTL_SECONDS", 86400)
WS_OFFLINE_CACHE_MAX_MESSAGES = _read_int_env("WS_OFFLINE_CACHE_MAX_MESSAGES", 200)


T = TypeVar("T")


async def _resolve_redis_call(result: T | Awaitable[T]) -> T:
    if isawaitable(result):
        return await cast(Awaitable[T], result)
    return result


class ConnectionManager:
    def __init__(
        self,
        channel: str,
        cache: Any | None = None,
        offline_cache_ttl_seconds: int = WS_OFFLINE_CACHE_TTL_SECONDS,
        offline_cache_max_messages: int = WS_OFFLINE_CACHE_MAX_MESSAGES,
    ):
        self.channel = channel
        self.connections: dict[str, WebSocket] = {}
        self.cache = cache
        self._cache_init_lock: asyncio.Lock | None = None
        self.offline_cache_ttl_seconds = offline_cache_ttl_seconds
        self.offline_cache_max_messages = offline_cache_max_messages
        self._memory_offline_messages: dict[str, deque[str]] = defaultdict(
            lambda: deque(maxlen=self.offline_cache_max_messages)
        )

    async def _ensure_cache(self) -> Any | None:
        if self.cache is not None:
            return self.cache
        if self._cache_init_lock is None:
            self._cache_init_lock = asyncio.Lock()
        async with self._cache_init_lock:
            if self.cache is not None:
                return self.cache
            try:
                self.cache = await redis_pool()
            except Exception as e:
                exception_logger.error(
                    format_log_message(
                        "websocket_cache_init_failed",
                        channel=self.channel,
                        error=e,
                    )
                )
                self.cache = None
        return self.cache

    async def close_cache(self):
        if self.cache is None:
            return
        close_fn = getattr(self.cache, "close", None)
        if close_fn is None:
            self.cache = None
            return
        try:
            await _resolve_redis_call(close_fn())
        except Exception as e:
            exception_logger.error(
                format_log_message(
                    "websocket_cache_close_failed",
                    channel=self.channel,
                    error=e,
                )
            )
        finally:
            self.cache = None

    def _offline_cache_key(self, websocket_id: str) -> str:
        return f"ws:offline:{self.channel}:{websocket_id}"

    async def _cache_offline_message(self, websocket_id: str, message: str):
        cache_key = self._offline_cache_key(websocket_id)
        cache = await self._ensure_cache()
        if cache is not None:
            try:
                async with cache.pipeline(transaction=True) as pipeline:
                    pipeline.rpush(cache_key, message)
                    pipeline.ltrim(cache_key, -self.offline_cache_max_messages, -1)
                    pipeline.expire(cache_key, self.offline_cache_ttl_seconds)
                    await _resolve_redis_call(pipeline.execute())
                return
            except Exception as e:
                exception_logger.error(
                    format_log_message(
                        "websocket_message_cache_failed",
                        channel=self.channel,
                        websocket_id=websocket_id,
                        error=e,
                    )
                )
        self._memory_offline_messages[websocket_id].append(message)

    async def _pop_offline_messages(self, websocket_id: str) -> list[str]:
        cache_key = self._offline_cache_key(websocket_id)
        cache = await self._ensure_cache()
        if cache is not None:
            try:
                async with cache.pipeline(transaction=True) as pipeline:
                    pipeline.lrange(cache_key, 0, -1)
                    pipeline.delete(cache_key)
                    result = await _resolve_redis_call(pipeline.execute())
                cached_messages = result[0] if result else []
                if cached_messages:
                    return list(cached_messages)
            except Exception as e:
                exception_logger.error(
                    format_log_message(
                        "websocket_cached_messages_read_failed",
                        channel=self.channel,
                        websocket_id=websocket_id,
                        error=e,
                    )
                )
        memory_cached_messages = list(self._memory_offline_messages.pop(websocket_id, []))
        return memory_cached_messages

    async def _replay_offline_messages(self, websocket_id: str):
        cached_messages = await self._pop_offline_messages(websocket_id=websocket_id)
        if len(cached_messages) == 0:
            return
        connection = self.get_connection(websocket_id)
        if connection is None:
            return
        info_logger.info(
            format_log_message(
                "websocket_offline_messages_replayed",
                channel=self.channel,
                websocket_id=websocket_id,
                message_count=len(cached_messages),
            )
        )
        for index, message in enumerate(cached_messages):
            try:
                await connection.send_text(message)
            except Exception as e:
                exception_logger.error(
                    format_log_message(
                        "websocket_cached_message_replay_failed",
                        channel=self.channel,
                        websocket_id=websocket_id,
                        error=e,
                    )
                )
                self.disconnect(websocket_id)
                remain_messages = cached_messages[index:]
                for remain_message in remain_messages:
                    await self._cache_offline_message(
                        websocket_id=websocket_id,
                        message=remain_message
                    )
                return

    async def connect(self, id: str, websocket: WebSocket):
        info_logger.info(
            format_log_message(
                "websocket_connected",
                channel=self.channel,
                websocket_id=id,
            )
        )
        await websocket.accept()
        self.connections[id] = websocket
        await self._replay_offline_messages(websocket_id=id)

    def disconnect(self, id: str, websocket: WebSocket | None = None):
        current_connection = self.connections.get(id)
        if current_connection is None:
            return
        if websocket is not None and current_connection is not websocket:
            return
        self.connections.pop(id, None)

    def get_connection(self, id: str):
        return self.connections.get(id)

    async def send_personal_message(self, message: str, websocket_id: str) -> bool:
        connection = self.get_connection(websocket_id)
        if connection is None:
            await self._cache_offline_message(websocket_id=websocket_id, message=message)
            return False
        try:
            await connection.send_text(message)
            return True
        except Exception as e:
            exception_logger.error(
                format_log_message(
                    "websocket_send_failed",
                    channel=self.channel,
                    websocket_id=websocket_id,
                    error=e,
                )
            )
            self.disconnect(websocket_id)
            await self._cache_offline_message(websocket_id=websocket_id, message=message)
            return False

    async def broadcast(self, message: str):
        connection_items = list(self.connections.items())
        for connection_id, connection in connection_items:
            try:
                await connection.send_text(message)
            except Exception as e:
                exception_logger.error(
                    format_log_message(
                        "websocket_broadcast_failed",
                        channel=self.channel,
                        websocket_id=connection_id,
                        error=e,
                    )
                )
                self.disconnect(connection_id)

    async def count(self):
        return len(self.connections)


notificationManager = ConnectionManager(channel="notification")
