from rich import print
from datetime import datetime, timezone
from data.custom_types.all import ChunkInfo, RelationInfo, EntityInfo
from data.neo4j.base import neo4j_driver

def now_str():
    return datetime.now(tz=timezone.utc).isoformat()

# -----------------------------
# 4) 批量 upsert Chunk 节点
# -----------------------------
def upsert_chunks_neo4j(chunks_info: list[ChunkInfo]):
    cypher = """
    UNWIND $rows AS r
    MERGE (c:Chunk {id: r.id})
    SET c.text = r.text,
        c.doc_id = r.doc_id,
        c.idx = r.idx,
        c.updated_at = datetime(r.updated_at),
        c.created_at = coalesce(c.created_at, datetime(r.created_at))
    RETURN count(*) AS updated
    """
    now = now_str()
    rows = [
        {
            **c.model_dump(),
            "created_at": now,
            "updated_at": now
        } for c in chunks_info
    ]
    with neo4j_driver.session() as session:
        session.run(cypher, rows=rows)

# -----------------------------
# 7) 批量 upsert Entity 节点
# -----------------------------
def upsert_entities_neo4j(entities_info: list[EntityInfo]):
    cypher = """
    UNWIND $rows AS r
    MERGE (e:Entity {id: r.id})
    SET e.text = r.text,
        e.entity_type = r.entity_type,
        e.chunks = r.chunks,
        e.updated_at = datetime(r.updated_at),
        e.created_at = coalesce(e.created_at, datetime(r.created_at))
    RETURN count(*) AS updated
    """
    now = now_str()
    rows = [
        {
            "id": e.id,
            "text": e.text,
            "entity_type": e.entity_type,
            "chunks": e.chunks,
            "created_at": now,
            "updated_at": now
        }
        for e in entities_info
    ]
    with neo4j_driver.session() as session:
        session.run(cypher, rows=rows)

# -----------------------------
# 8) 批量 upsert Entity -> Entity 的关系
# -----------------------------
def upsert_relations_neo4j(relations_info: list[RelationInfo]):
    cypher = """
    UNWIND $rows AS r
    MERGE (a:Entity {id: r.src_node})
    MERGE (b:Entity {id: r.tgt_node})
    CALL apoc.merge.relationship(a, r.relation_type, {}, {last_seen: datetime(r.last_seen)}, b, {})
    YIELD rel
    RETURN count(*) AS created
    """
    now = now_str()
    rows = [
        {
            "src_node": r.src_node,
            "tgt_node": r.tgt_node,
            "relation_type": r.relation_type,
            "last_seen": now
        }
        for r in relations_info
    ]
    with neo4j_driver.session() as session:
        session.run(cypher, rows=rows)

# -----------------------------
# 8.1) Neo4j：Chunk -> Entity 关系
# -----------------------------
def upsert_chunk_entity_relations():
    cypher = """
    MATCH (e:Entity)
    UNWIND e.chunks AS eid
    MATCH (c:Chunk {id: eid})
    MERGE (c)-[:MENTIONS]->(e)
    """
    with neo4j_driver.session() as session:
        session.run(cypher)

# -----------------------------
# 9) 社区聚类（Louvain）
# -----------------------------
def create_communities_from_chunks():
    with neo4j_driver.session() as session:
        session.run("""
            CALL gds.graph.project(
                'communityGraph',
                'Entity',
                { RELATED_TO: {orientation: 'UNDIRECTED'} }
            )
        """)
        result = session.run("""
            CALL gds.louvain.write(
                'communityGraph',
                { writeProperty: 'community' }
            ) YIELD communityCount, modularity
        """)
        for record in result:
            print(record['communityCount'], record['modularity'])
        session.run("CALL gds.graph.drop('communityGraph')")

# -----------------------------
# 10) 创建 Community 节点 & 关联 Entity 和 Chunk
# -----------------------------
def create_community_nodes_and_relationships_with_size():
    now = now_str()
    with neo4j_driver.session() as session:
        session.run("""
            MATCH (e:Entity)
            WITH DISTINCT e.community AS comm_id
            WHERE comm_id IS NOT NULL
            MERGE (com:Community {id: comm_id})
            SET com.created_at = coalesce(com.created_at, datetime($now)),
                com.updated_at = datetime($now)
        """, {"now": now})

        session.run("""
            MATCH (e:Entity)
            MATCH (com:Community {id: e.community})
            MERGE (e)-[:BELONGS_TO]->(com)
        """)

        session.run("""
            MATCH (c:Chunk)-[:MENTIONS]->(e:Entity)
            MATCH (com:Community {id: e.community})
            MERGE (c)-[:BELONGS_TO]->(com)
        """)

        session.run("""
            MATCH (com:Community)<-[:BELONGS_TO]-(n)
            WITH com, count(n) AS member_count
            SET com.size = member_count
        """)

        communities = session.run("MATCH (com:Community) RETURN com.id, com.size")
        for record in communities:
            print(f"Community {record['com.id']} has {record['com.size']} members")

# -----------------------------
# 11) 所有节点 degree 标注
# -----------------------------
def annotate_node_degrees():
    with neo4j_driver.session() as session:
        session.run("""
            MATCH (n:Entity)
            WITH n, COUNT { (n)--() } AS deg
            SET n.degree = deg
        """)
        session.run("""
            MATCH (n:Chunk)
            WITH n, COUNT { (n)--() } AS deg
            SET n.degree = deg
        """)
        session.run("""
            MATCH (n:Community)
            WITH n, COUNT { (n)--() } AS deg
            SET n.degree = deg
        """)