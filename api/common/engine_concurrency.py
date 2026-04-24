from __future__ import annotations

import asyncio
import threading
from contextlib import asynccontextmanager


_SEMAPHORE_LOCK = threading.Lock()
_SEMAPHORE_REGISTRY: dict[str, tuple[int, threading.BoundedSemaphore]] = {}


def _get_semaphore(queue_key: str, limit: int) -> threading.BoundedSemaphore:
    normalized_limit = max(1, int(limit))
    with _SEMAPHORE_LOCK:
        entry = _SEMAPHORE_REGISTRY.get(queue_key)
        if entry is not None and entry[0] == normalized_limit:
            return entry[1]
        semaphore = threading.BoundedSemaphore(normalized_limit)
        _SEMAPHORE_REGISTRY[queue_key] = (normalized_limit, semaphore)
        return semaphore


@asynccontextmanager
async def acquire_engine_slot(*, queue_key: str, limit: int):
    semaphore = _get_semaphore(queue_key=queue_key, limit=limit)
    await asyncio.to_thread(semaphore.acquire)
    try:
        yield
    finally:
        semaphore.release()
