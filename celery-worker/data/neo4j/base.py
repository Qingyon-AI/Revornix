"""Per-event-loop Neo4j async driver.

Background
----------
The neo4j async driver internally binds to whichever asyncio loop instantiated
it. Reusing the same driver from a different (or closed) loop raises
``Future attached to a different loop``.

The celery worker invokes ``asyncio.run(coro)`` per task — each task therefore
runs in a brand-new loop that is closed when the task finishes. We solve this
by keeping a *driver-per-loop* registry and closing each driver inside its own
loop just before that loop shuts down.

Usage contract
--------------
1. ``async_neo4j_driver`` proxies to the driver bound to the *currently
   running* loop, lazily creating one on first access.
2. The task entry point (see ``common/celery/app.py::_run``) **must** call
   ``await close_neo4j_driver_for_current_loop()`` at the end of every coro it
   runs. The wrapper there does this in a ``finally`` block so leaks are
   impossible regardless of success / failure.
"""
import asyncio
from threading import Lock
from typing import Any
from urllib.parse import urlparse, urlunparse

from neo4j import AsyncDriver, AsyncGraphDatabase
from neo4j.exceptions import ServiceUnavailable

from common.logger import exception_logger
from config.neo4j import NEO4J_PASS, NEO4J_URI, NEO4J_USER

if NEO4J_URI is None or NEO4J_USER is None or NEO4J_PASS is None:
    raise ValueError(
        "NEO4J_URI and NEO4J_USER and NEO4J_PASS must be set in the environment to connect to a Neo4j database"
    )


LOCAL_SINGLE_INSTANCE_HOSTS = {"localhost", "127.0.0.1", "0.0.0.0", "neo4j"}


def normalize_neo4j_uri(uri: str) -> str:
    parsed = urlparse(uri)
    if parsed.scheme == "neo4j" and parsed.hostname in LOCAL_SINGLE_INSTANCE_HOSTS:
        return urlunparse(parsed._replace(scheme="bolt"))
    return uri


# loop_id -> driver. We key by id() (cheap, stable for a live loop's lifetime)
# and store the loop reference so we can sanity-check it before reuse.
_drivers_by_loop: dict[int, tuple[asyncio.AbstractEventLoop, AsyncDriver]] = {}
_registry_lock = Lock()


def _build_driver() -> AsyncDriver:
    uri = normalize_neo4j_uri(NEO4J_URI)
    return AsyncGraphDatabase.driver(
        uri=uri,
        auth=(NEO4J_USER, NEO4J_PASS),
    )


def _driver_for_running_loop() -> AsyncDriver:
    loop = asyncio.get_running_loop()
    loop_id = id(loop)
    entry = _drivers_by_loop.get(loop_id)
    if entry is not None:
        cached_loop, driver = entry
        if cached_loop is loop and not loop.is_closed():
            return driver
        # Stale entry (id collision after a previous loop was GC'd). Drop it.
        _drivers_by_loop.pop(loop_id, None)

    with _registry_lock:
        entry = _drivers_by_loop.get(loop_id)
        if entry is not None and entry[0] is loop and not loop.is_closed():
            return entry[1]
        driver = _build_driver()
        _drivers_by_loop[loop_id] = (loop, driver)
        return driver


async def close_neo4j_driver_for_current_loop() -> None:
    """Close (and unregister) the neo4j driver bound to the currently running
    loop, if one was created. Safe to call when no driver was ever opened.

    Intended to be invoked from a ``finally`` block at the end of each task,
    while the loop is still alive — only then can ``await driver.close()``
    cleanly release the underlying bolt connections.
    """
    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        return
    entry = _drivers_by_loop.pop(id(loop), None)
    if entry is None:
        return
    _, driver = entry
    try:
        await driver.close()
    except Exception as exc:  # pragma: no cover — best-effort cleanup
        exception_logger.warning(f"Failed to close neo4j async driver: {exc}")


class _LazyAsyncNeo4jDriver:
    """Module-level proxy. Each attribute access resolves to the driver bound
    to the running loop, creating one on demand.
    """

    def __getattr__(self, item: str) -> Any:
        return getattr(_driver_for_running_loop(), item)


async_neo4j_driver = _LazyAsyncNeo4jDriver()
