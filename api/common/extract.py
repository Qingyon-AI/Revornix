from neo4j import GraphDatabase

# 创建连接到 Neo4j 的驱动
uri = "bolt://localhost:7687"
driver = GraphDatabase.driver(uri, auth=("neo4j", "12345678"))

