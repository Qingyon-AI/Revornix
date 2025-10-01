from rich import print
from data.custom_types.all import ChunkInfo, RelationInfo, EntityInfo
from data.neo4j.base import neo4j_driver

# -----------------------------
# 4) Neo4j：批量创建/更新 Chunk 节点（UNWIND）
# -----------------------------
def upsert_chunks_neo4j(chunks_info: list[ChunkInfo]):
    cypher = """
    UNWIND $rows AS r
    MERGE (c:Chunk {id: r.id})
    SET c.text = r.text,
        c.doc_id = r.doc_id,
        c.idx = r.idx,
        c.id = r.id
    RETURN count(*) AS updated
    """
    rows = [c.model_dump() for c in chunks_info]
    with neo4j_driver.session() as session:
        session.run(cypher, rows=rows)

# -----------------------------
# 7) Neo4j：批量创建/更新 Entity 节点（UNWIND）
# -----------------------------
def upsert_entities_neo4j(entities_info: list[EntityInfo]):
    cypher = """
    UNWIND $rows AS r
    MERGE (e:Entity {name: r.text})
    SET e.id = r.id
    SET e.text = r.text
    SET e.entity_type = r.entity_type
    SET e.chunks = r.chunks
    RETURN count(*) AS updated
    """
    rows = [{"id": e.id, "text": e.text, "entity_type": e.entity_type, "chunks": e.chunks} for e in entities_info]
    with neo4j_driver.session() as session:
        session.run(cypher, rows=rows)

# -----------------------------
# 8) Neo4j：批量创建/更新 Relation 节点（UNWIND）
# -----------------------------
def upsert_relations_neo4j(relations_info: list[RelationInfo]):
    cypher = """
    UNWIND $rows AS r
    MERGE (a:Entity {id: r.src_node})
    MERGE (b:Entity {id: r.tgt_node})
    WITH a, b, r
    CALL apoc.merge.relationship(a, r.relation_type, {}, {created: datetime()}, b, {lastSeen: datetime()}) YIELD rel
    RETURN count(*) AS created
    """
    rows = [{"src_node":r.src_node, "tgt_node": r.tgt_node, "relation_type":r.relation_type} for r in relations_info]
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
# 9) Community 聚类（基于 chunk embedding）
# -----------------------------
def create_communities_from_chunks():
    with neo4j_driver.session() as session:
        # 创建图投影
        session.run("""
            CALL gds.graph.project(
                'communityGraph',
                'Entity',
                { RELATED_TO: {orientation: 'UNDIRECTED'} }
            )
        """)
        # Louvain 聚类
        result = session.run("""
            CALL gds.louvain.write(
                'communityGraph',
                { writeProperty: 'community' }
            ) YIELD communityCount, modularity
        """)
        for record in result:
            print(record['communityCount'], record['modularity'])

        # 查询节点的社区
        nodes = session.run("MATCH (n:Entity) RETURN n.name, n.community")
        for n in nodes:
            print(n['n.name'], n['n.community'])

        # 删除图投影
        session.run("CALL gds.graph.drop('communityGraph')")

# -----------------------------
# 10) Neo4j：创建 Community 节点，并关联 Entity 和 Chunk
# -----------------------------
def create_community_nodes_and_relationships_with_size():
    """
    基于 entity 的 community 属性：
    1. 创建 Community 节点
    2. 关联 Entity 和 Chunk
    3. 给 Community 节点增加 size 属性
    """
    with neo4j_driver.session() as session:
        # 1️⃣ 创建 Community 节点（去重）
        session.run("""
            MATCH (e:Entity)
            WITH DISTINCT e.community AS comm_id
            WHERE comm_id IS NOT NULL
            MERGE (com:Community {id: comm_id})
        """)

        # 2️⃣ Entity -> Community
        session.run("""
            MATCH (e:Entity)
            MATCH (com:Community {id: e.community})
            MERGE (e)-[:BELONGS_TO]->(com)
        """)

        # 3️⃣ Chunk -> Community（继承实体的 community）
        session.run("""
            MATCH (c:Chunk)-[:MENTIONS]->(e:Entity)
            MATCH (com:Community {id: e.community})
            MERGE (c)-[:BELONGS_TO]->(com)
        """)

        # 4️⃣ 可选优化：记录社区成员数量
        session.run("""
            MATCH (com:Community)<-[:BELONGS_TO]-(n)
            WITH com, count(n) AS member_count
            SET com.size = member_count
        """)

        # 5️⃣ 查询检查
        communities = session.run("MATCH (com:Community) RETURN com.id, com.size")
        for record in communities:
            print(f"Community {record['com.id']} has {record['com.size']} members")
            
# -----------------------------
# 11) Neo4j：为所有节点设置 degree 属性（连接数）
# -----------------------------
def annotate_node_degrees():
    with neo4j_driver.session() as session:
        # 设置 Entity 节点的 degree
        session.run("""
            MATCH (n:Entity)
            WITH n, COUNT { (n)--() } AS deg
            SET n.degree = deg
        """)

        # 设置 Chunk 节点的 degree
        session.run("""
            MATCH (n:Chunk)
            WITH n, COUNT { (n)--() } AS deg
            SET n.degree = deg
        """)

        # 设置 Community 节点的 degree
        session.run("""
            MATCH (n:Community)
            WITH n, COUNT { (n)--() } AS deg
            SET n.degree = deg
        """)
    
if __name__ == "__main__":
    annotate_node_degrees()