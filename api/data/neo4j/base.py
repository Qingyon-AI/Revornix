from dotenv import load_dotenv

load_dotenv(override=True)

from threading import Lock
from urllib.parse import urlparse, urlunparse

from neo4j import AsyncGraphDatabase

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


class _LazyAsyncNeo4jDriver:
    def __init__(self) -> None:
        self._driver = None
        self._lock = Lock()

    def _get_driver(self):
        if self._driver is not None:
            return self._driver
        with self._lock:
            if self._driver is None:
                uri = normalize_neo4j_uri(NEO4J_URI)
                self._driver = AsyncGraphDatabase.driver(
                    uri=uri,
                    auth=(NEO4J_USER, NEO4J_PASS),
                )
        return self._driver

    def __getattr__(self, item):
        return getattr(self._get_driver(), item)


async_neo4j_driver = _LazyAsyncNeo4jDriver()
