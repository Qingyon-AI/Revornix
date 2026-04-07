from dotenv import load_dotenv

load_dotenv(override=True)

from threading import Lock

from neo4j import GraphDatabase

from config.neo4j import NEO4J_PASS, NEO4J_URI, NEO4J_USER

if NEO4J_URI is None or NEO4J_USER is None or NEO4J_PASS is None:
    raise ValueError(
        "NEO4J_URI and NEO4J_USER and NEO4J_PASS must be set in the environment to connect to a Neo4j database"
    )


class _LazyNeo4jDriver:
    def __init__(self) -> None:
        self._driver = None
        self._lock = Lock()

    def _get_driver(self):
        if self._driver is not None:
            return self._driver
        with self._lock:
            if self._driver is None:
                self._driver = GraphDatabase.driver(
                    uri=NEO4J_URI,
                    auth=(NEO4J_USER, NEO4J_PASS),
                )
        return self._driver

    def __getattr__(self, item):
        return getattr(self._get_driver(), item)


neo4j_driver = _LazyNeo4jDriver()
