import schemas
import models
import crud
from common.dependencies import get_current_user, get_db
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from data.neo4j.base import neo4j_driver

graph_router = APIRouter()

@graph_router.post('/section', response_model=schemas.graph.GraphResponse)
async def section_graph(section_graph_request: schemas.graph.SectionGraphRequest,
                        user: models.user.User = Depends(get_current_user),
                        db: Session = Depends(get_db)):
    section_id = section_graph_request.section_id
    
    documents = crud.section.get_documents_by_section_id(db=db, section_id=section_id)
    document_ids = [document.id for document in documents]
    nodes, edges = [], []

    if not document_ids:
        return schemas.graph.GraphResponse(nodes=[], edges=[])

    with neo4j_driver.session() as session:
        entity_query = """
            UNWIND $doc_ids AS doc_id
            MATCH (d:Document {id: doc_id})
            WHERE d.creator_id = $user_id
            MATCH (d)-[:HAS_CHUNK]->(c:Chunk)-[:MENTIONS]->(e:Entity)
            RETURN DISTINCT e.id AS id, e.text AS text, e.degree AS degree
        """
        edge_query = """
            UNWIND $doc_ids AS doc_id
            MATCH (d:Document {id: doc_id})
            WHERE d.creator_id = $user_id
            MATCH (d)-[:HAS_CHUNK]->(c1:Chunk)-[:MENTIONS]->(e1:Entity)
            MATCH (d)-[:HAS_CHUNK]->(c2:Chunk)-[:MENTIONS]->(e2:Entity)
            MATCH (e1)-[r]->(e2)
            RETURN DISTINCT e1.id AS src_id, e2.id AS tgt_id
        """
        entities_result = session.run(entity_query, doc_ids=document_ids, user_id=user.id)
        relations_result = session.run(edge_query, doc_ids=document_ids, user_id=user.id)

        unique_nodes = {}
        for record in entities_result:
            node_id = record["id"]
            if node_id not in unique_nodes:
                unique_nodes[node_id] = schemas.graph.Node(
                    id=node_id,
                    text=record.get("text", ""),
                    degree=record.get("degree", 0)
                )
        nodes = list(unique_nodes.values())

        for record in relations_result:
            edges.append(schemas.graph.Edge(
                src_node=record["src_id"],
                tgt_node=record["tgt_id"]
            ))

    return schemas.graph.GraphResponse(nodes=nodes, edges=edges)

@graph_router.post('/document', response_model=schemas.graph.GraphResponse)
async def document_graph(document_graph_request: schemas.graph.DocumentGraphRequest,
                         user: models.user.User = Depends(get_current_user)):
    doc_id = document_graph_request.document_id  # Optional[int]
    nodes = []
    edges = []

    with neo4j_driver.session() as session:
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

@graph_router.post("/search", response_model=schemas.graph.GraphResponse)
async def graph(user: models.user.User = Depends(get_current_user)):
    nodes = []
    edges = []

    with neo4j_driver.session() as session:
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