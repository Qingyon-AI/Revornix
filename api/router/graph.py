import schemas
import models
from common.dependencies import get_current_user
from fastapi import APIRouter, Depends
from data.neo4j.base import neo4j_driver

graph_router = APIRouter()

@graph_router.post("/search", response_model=schemas.graph.GraphResponse)
async def graph(graph_request: schemas.graph.GraphRequest,
                user: models.user.User = Depends(get_current_user)):
    doc_id = graph_request.doc_id  # Optional[int]
    nodes = []
    edges = []

    with neo4j_driver.session() as session:

        if doc_id is not None:
            # 🌐 有 doc_id：通过 Chunk 限定实体
            entity_query = """
                MATCH (c:Chunk {doc_id: $doc_id})-[:MENTIONS]->(e:Entity)
                RETURN DISTINCT e.id AS id, e.text AS text, e.degree AS degree
            """
            entities_result = session.run(entity_query, doc_id=doc_id)

            edge_query = """
                MATCH (c1:Chunk {doc_id: $doc_id})-[:MENTIONS]->(e1:Entity)
                MATCH (c2:Chunk {doc_id: $doc_id})-[:MENTIONS]->(e2:Entity)
                MATCH (e1)-[r]->(e2)
                RETURN DISTINCT e1.id AS src_id, e2.id AS tgt_id
            """
            relations_result = session.run(edge_query, doc_id=doc_id)

        else:
            # 🌍 无 doc_id：返回全图实体与关系
            entity_query = """
                MATCH (e:Entity)
                RETURN e.id AS id, e.text AS text, e.degree AS degree
            """
            entities_result = session.run(entity_query)

            edge_query = """
                MATCH (e1:Entity)-[r]->(e2:Entity)
                RETURN DISTINCT e1.id AS src_id, e2.id AS tgt_id
            """
            relations_result = session.run(edge_query)

        # 🧱 构造节点
        for record in entities_result:
            nodes.append(schemas.graph.Node(
                id=record.get('id'),
                text=record.get("text", "") or "",
                degree=record.get("degree", 0)
            ))

        # 🔗 构造边
        for record in relations_result:
            edges.append(schemas.graph.Edge(
                src_node=record.get('src_id'),
                tgt_node=record.get('tgt_id')
            ))

    return schemas.graph.GraphResponse(nodes=nodes, edges=edges)