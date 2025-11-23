from neo4j import GraphDatabase
from config.neo4j import NEO4J_USER, NEO4J_PASS, NEO4J_URI

if NEO4J_URI is None or NEO4J_USER is None or NEO4J_PASS is None:
    raise ValueError(
        "NEO4J_URI and NEO4J_USER and NEO4J_PASS must be set in the environment to connect to a Neo4j database"
    )

neo4j_driver = GraphDatabase.driver(uri=NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASS))