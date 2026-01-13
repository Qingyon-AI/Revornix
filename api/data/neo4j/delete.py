from data.neo4j.base import neo4j_driver
from common.logger import info_logger

def clear_data():
    with neo4j_driver.session() as session:
        session.run("MATCH (n) DETACH DELETE n")
        info_logger.info("All Neo4j nodes and relationships deleted.")

def delete_documents_and_related_from_neo4j(
    doc_ids: list[int]
):
    """
    批量删除指定 Document（整数 id）及其关联 Chunk、Entity、Community
    """
    if not doc_ids:
        return

    with neo4j_driver.session() as session:
        session.execute_write(_delete_documents_tx, doc_ids)

def _delete_documents_tx(
    tx, 
    doc_ids: list[int]
):
    # -----------------------------
    # 1️⃣ 删除 Document & Chunks
    # -----------------------------
    tx.run("""
        UNWIND $doc_ids AS did
        MATCH (d:Document {id: did})-[:HAS_CHUNK]->(c:Chunk)
        DETACH DELETE c
        DETACH DELETE d
    """, doc_ids=doc_ids)

    # -----------------------------
    # 2️⃣ 删除无 Chunk 引用的 Entity
    # -----------------------------
    tx.run("""
        MATCH (e:Entity)
        WHERE NOT (e)<-[:MENTIONS]-(:Chunk)
        DETACH DELETE e
    """)

    # -----------------------------
    # 3️⃣ 删除空 Community
    # -----------------------------
    tx.run("""
        MATCH (com:Community)
        WHERE NOT (com)<-[:BELONGS_TO]-()
        DETACH DELETE com
    """)
        
if __name__ == "__main__":
    clear_data()