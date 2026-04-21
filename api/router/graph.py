from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

import crud
import models
import schemas
from common.dependencies import get_current_user, get_current_user_without_throw, get_db
from data.neo4j.base import neo4j_driver
from enums.section import UserSectionRole

graph_router = APIRouter()

@graph_router.post('/section', response_model=schemas.graph.GraphResponse)
def section_graph(
    section_graph_request: schemas.graph.SectionGraphRequest,
    user: models.user.User = Depends(get_current_user_without_throw),
    db: Session = Depends(get_db)
):

    nodes, edges = [], []

    section_id = section_graph_request.section_id

    section = crud.section.get_section_by_section_id(
        db=db,
        section_id=section_id
    )

    if not section:
        raise schemas.error.CustomException("Section not found", code=404)

    documents = crud.section.get_documents_for_section_by_section_id(
        db=db,
        section_id=section_id
    )
    document_ids = [document.id for document in documents]

    # 如果专栏是公开的 直接返回所有节点
    db_section_publish = crud.section.get_publish_section_by_section_id(
        db=db,
        section_id=section_id
    )
    if db_section_publish is not None:
        with neo4j_driver.session() as session:
            entity_query = """
                UNWIND $doc_ids AS doc_id
                MATCH (d:Document {id: doc_id})
                MATCH (d)-[:HAS_CHUNK]->(c:Chunk)-[:MENTIONS]->(e:Entity)
                WITH DISTINCT e, d, c, c.idx AS chunk_idx
                ORDER BY coalesce(d.id, 2147483647), coalesce(chunk_idx, 2147483647), coalesce(c.id, "")
                WITH e, collect({
                    doc_id: d.id,
                    doc_title: d.title,
                    chunk_id: c.id
                }) AS sources
                RETURN e.id AS id, e.text AS text, coalesce(e.degree, 0) AS degree,
                       sources AS sources
            """
            edge_query = """
                UNWIND $doc_ids AS doc_id
                MATCH (d:Document {id: doc_id})
                MATCH (d)-[:HAS_CHUNK]->(c1:Chunk)-[:MENTIONS]->(e1:Entity)
                MATCH (d)-[:HAS_CHUNK]->(c2:Chunk)-[:MENTIONS]->(e2:Entity)
                MATCH (e1)-[r]->(e2)
                RETURN DISTINCT e1.id AS src_id, e2.id AS tgt_id
            """
            entities_result = session.run(entity_query, doc_ids=document_ids)
            relations_result = session.run(edge_query, doc_ids=document_ids)

            unique_nodes = {}
            for record in entities_result:
                node_id = record["id"]
                if node_id not in unique_nodes:
                    unique_nodes[node_id] = schemas.graph.Node(
                        id=node_id,
                        text=record.get("text", ""),
                        degree=record.get("degree", 0),
                        sources=record.get("sources") or [],
                    )
            nodes = list(unique_nodes.values())

            for record in relations_result:
                edges.append(schemas.graph.Edge(
                    src_node=record["src_id"],
                    tgt_node=record["tgt_id"]
                ))
    else:
        # 如果专栏不是公开的，需要检查用户是否是专栏的成员

        if user is None:
            raise schemas.error.CustomException("You don't have permission to view this section", code=403)

        users = crud.section.get_users_for_section_by_section_id(
            db=db,
            section_id=section_id,
            filter_roles=[UserSectionRole.MEMBER, UserSectionRole.CREATOR])

        if user.id not in [user.id for user in users]:
            raise schemas.error.CustomException("You don't have permission to view this section", code=403)
        else:
            with neo4j_driver.session() as session:
                entity_query = """
                    UNWIND $doc_ids AS doc_id
                    MATCH (d:Document {id: doc_id})
                    MATCH (d)-[:HAS_CHUNK]->(c:Chunk)-[:MENTIONS]->(e:Entity)
                    WITH DISTINCT e, d, c, c.idx AS chunk_idx
                    ORDER BY coalesce(d.id, 2147483647), coalesce(chunk_idx, 2147483647), coalesce(c.id, "")
                    WITH e, collect({
                        doc_id: d.id,
                        doc_title: d.title,
                        chunk_id: c.id
                    }) AS sources
                    RETURN e.id AS id, e.text AS text, coalesce(e.degree, 0) AS degree,
                           sources AS sources
                """
                edge_query = """
                    UNWIND $doc_ids AS doc_id
                    MATCH (d:Document {id: doc_id})
                    MATCH (d)-[:HAS_CHUNK]->(c1:Chunk)-[:MENTIONS]->(e1:Entity)
                    MATCH (d)-[:HAS_CHUNK]->(c2:Chunk)-[:MENTIONS]->(e2:Entity)
                    MATCH (e1)-[r]->(e2)
                    RETURN DISTINCT e1.id AS src_id, e2.id AS tgt_id
                """
                entities_result = session.run(entity_query, doc_ids=document_ids)
                relations_result = session.run(edge_query, doc_ids=document_ids)

                unique_nodes = {}
                for record in entities_result:
                    node_id = record["id"]
                    if node_id not in unique_nodes:
                        unique_nodes[node_id] = schemas.graph.Node(
                            id=node_id,
                            text=record.get("text", ""),
                            degree=record.get("degree", 0),
                            sources=record.get("sources") or [],
                        )
                nodes = list(unique_nodes.values())

                for record in relations_result:
                    edges.append(schemas.graph.Edge(
                        src_node=record["src_id"],
                        tgt_node=record["tgt_id"]
                    ))

    return schemas.graph.GraphResponse(nodes=nodes, edges=edges)

@graph_router.post('/document', response_model=schemas.graph.GraphResponse)
def document_graph(
    document_graph_request: schemas.graph.DocumentGraphRequest,
    user: models.user.User | None = Depends(get_current_user_without_throw),
    db: Session = Depends(get_db),
):
    doc_id = document_graph_request.document_id
    nodes = []
    edges = []

    document = crud.document.get_document_by_document_id(
        db=db,
        document_id=doc_id,
    )
    if document is None:
        raise schemas.error.CustomException("Document not found", code=404)

    db_published_document = crud.document.get_publish_document_by_document_id(
        db=db,
        document_id=doc_id,
    )
    has_public_document = db_published_document is not None
    is_creator = user is not None and document.creator_id == user.id
    has_document_collaborator = False

    if user is not None and not is_creator and not has_public_document:
        db_user_document = crud.document.get_user_document_by_user_id_and_document_id(
            db=db,
            user_id=user.id,
            document_id=doc_id,
        )
        has_document_collaborator = db_user_document is not None

    if not is_creator and not has_public_document and not has_document_collaborator:
        raise schemas.error.CustomException(
            "You don't have permission to view this document",
            code=403,
        )

    with neo4j_driver.session() as session:
        entity_query = """
            MATCH (d:Document {id: $doc_id})
            MATCH (d)-[:HAS_CHUNK]->(c:Chunk)-[:MENTIONS]->(e:Entity)
            WITH DISTINCT e, d, c, c.idx AS chunk_idx
            ORDER BY coalesce(d.id, 2147483647), coalesce(chunk_idx, 2147483647), coalesce(c.id, "")
            WITH e, collect({
                doc_id: d.id,
                doc_title: d.title,
                chunk_id: c.id
            }) AS sources
            RETURN e.id AS id, e.text AS text, coalesce(e.degree, 0) AS degree,
                   sources AS sources
        """
        edge_query = """
            MATCH (d:Document {id: $doc_id})
            MATCH (d)-[:HAS_CHUNK]->(c1:Chunk)-[:MENTIONS]->(e1:Entity)
            MATCH (d)-[:HAS_CHUNK]->(c2:Chunk)-[:MENTIONS]->(e2:Entity)
            MATCH (e1)-[r]->(e2)
            RETURN DISTINCT e1.id AS src_id, e2.id AS tgt_id
        """
        entities_result = session.run(entity_query, doc_id=doc_id)
        relations_result = session.run(edge_query, doc_id=doc_id)

        # 🧱 构造节点
        for record in entities_result:
            nodes.append(schemas.graph.Node(
                id=record.get('id'),
                text=record.get("text", "") or "",
                degree=record.get("degree", 0),
                sources=record.get("sources") or [],
            ))

        # 🔗 构造边
        for record in relations_result:
            edges.append(schemas.graph.Edge(
                src_node=record.get('src_id'),
                tgt_node=record.get('tgt_id')
            ))

    return schemas.graph.GraphResponse(nodes=nodes, edges=edges)

@graph_router.post("/search", response_model=schemas.graph.GraphResponse)
def graph(
    user: models.user.User = Depends(get_current_user)
):
    nodes = []
    edges = []

    with neo4j_driver.session() as session:
        entity_query = """
            MATCH (d:Document)
            WHERE d.creator_id = $user_id
            MATCH (d)-[:HAS_CHUNK]->(c:Chunk)-[:MENTIONS]->(e:Entity)
            WITH DISTINCT e, d, c, c.idx AS chunk_idx
            ORDER BY coalesce(d.id, 2147483647), coalesce(chunk_idx, 2147483647), coalesce(c.id, "")
            WITH e, collect({
                doc_id: d.id,
                doc_title: d.title,
                chunk_id: c.id
            }) AS sources
            RETURN e.id AS id, e.text AS text, coalesce(e.degree, 0) AS degree,
                   sources AS sources
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
                degree=record.get("degree", 0),
                sources=record.get("sources") or [],
            ))

        # 🔗 构造边
        for record in relations_result:
            edges.append(schemas.graph.Edge(
                src_node=record.get('src_id'),
                tgt_node=record.get('tgt_id')
            ))

    return schemas.graph.GraphResponse(nodes=nodes, edges=edges)
