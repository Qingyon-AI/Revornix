from data.neo4j.base import async_neo4j_driver
from common.logger import info_logger

async def clear_data():
    async with async_neo4j_driver.session() as session:
        await session.run("MATCH (n) DETACH DELETE n")
        info_logger.info("All Neo4j nodes and relationships deleted.")

async def delete_documents_and_related_from_neo4j(
    doc_ids: list[int]
):
    """
    批量删除指定 Document（整数 id）及其关联 Chunk、Entity、Community
    """
    if not doc_ids:
        return

    async with async_neo4j_driver.session() as session:
        await session.execute_write(_delete_documents_tx, doc_ids)

async def _delete_documents_tx(
    tx, 
    doc_ids: list[int]
):
    # -----------------------------
    # 1️⃣ 删除 Document & Chunks
    # -----------------------------
    await tx.run("""
        UNWIND $doc_ids AS did
        MATCH (d:Document {id: did})-[:HAS_CHUNK]->(c:Chunk)
        DETACH DELETE c
        DETACH DELETE d
    """, doc_ids=doc_ids)

    # -----------------------------
    # 2️⃣ 删除无 Chunk 引用的 Entity
    # -----------------------------
    await tx.run("""
        MATCH (e:Entity)
        WHERE NOT (e)<-[:MENTIONS]-(:Chunk)
        DETACH DELETE e
    """)

    # -----------------------------
    # 3️⃣ 删除空 Community
    # -----------------------------
    await tx.run("""
        MATCH (com:Community)
        WHERE NOT (com)<-[:BELONGS_TO]-()
        DETACH DELETE com
    """)
        
if __name__ == "__main__":
    import asyncio

    from data.neo4j.base import close_neo4j_driver_for_current_loop

    async def _main() -> None:
        try:
            await clear_data()
        finally:
            await close_neo4j_driver_for_current_loop()

    asyncio.run(_main())
