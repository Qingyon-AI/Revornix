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
            # ✅ 有 doc_id：文档必须属于当前用户
            entity_query = """
                MATCH (d:Document {id: $doc_id})
                WHERE d.creator_id = $user_id
                MATCH (d)-[:HAS_CHUNK]->(c:Chunk)-[:MENTIONS]->(e:Entity)
                RETURN DISTINCT e.id AS id, e.text AS text, e.degree AS degree
            """
            edge_query = """
                MATCH (d:Document {id: $doc_id})
                WHERE d.creator_id = $user_id
                MATCH (d)-[:HAS_CHUNK]->(c1:Chunk)-[:MENTIONS]->(e1:Entity)
                MATCH (d)-[:HAS_CHUNK]->(c2:Chunk)-[:MENTIONS]->(e2:Entity)
                MATCH (e1)-[r]->(e2)
                RETURN DISTINCT e1.id AS src_id, e2.id AS tgt_id
            """
            entities_result = session.run(entity_query, doc_id=doc_id, user_id=user.id)
            relations_result = session.run(edge_query, doc_id=doc_id, user_id=user.id)

        else:
            # ✅ 无 doc_id：返回当前用户所有文档对应的实体图
            entity_query = """
                MATCH (d:Document)
                WHERE d.creator_id = $user_id
                MATCH (d)-[:HAS_CHUNK]->(c:Chunk)-[:MENTIONS]->(e:Entity)
                RETURN DISTINCT e.id AS id, e.text AS text, e.degree AS degree
            """
            edge_query = """
                MATCH (d:Document)
                WHERE d.creator_id = $user_id
                MATCH (d)-[:HAS_CHUNK]->(c1:Chunk)-[:MENTIONS]->(e1:Entity)
                MATCH (d)-[:HAS_CHUNK]->(c2:Chunk)-[:MENTIONS]->(e2:Entity)
                MATCH (e1)-[r]->(e2)
                RETURN DISTINCT e1.id AS src_id, e2.id AS tgt_id
            """
            entities_result = session.run(entity_query, user_id=user.id)
            relations_result = session.run(edge_query, user_id=user.id)

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