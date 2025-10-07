import crud
import hashlib
import openai
import json
from typing import cast
from chonkie.chunker import SemanticChunker
from chonkie.types import Chunk
from chonkie.embeddings import AutoEmbeddings
from enums.document import DocumentCategory
from common.common import get_user_remote_file_system
from common.sql import SessionLocal
from sentence_transformers import SentenceTransformer
from data.custom_types.all import *
from data.prompts.entity_and_relation_extraction import entity_and_relation_extraction_prompt
from data.milvus.insert import upsert_milvus
from data.neo4j.insert import upsert_chunk_entity_relations, upsert_entities_neo4j, upsert_chunks_neo4j, upsert_relations_neo4j, create_communities_from_chunks, create_community_nodes_and_relationships_with_size, annotate_node_degrees, upsert_doc_chunk_relations, upsert_doc_neo4j

def make_chunk_id(doc_id: int, idx: int, text: str) -> str:
    h = hashlib.sha256(text.encode("utf-8")).hexdigest()[:16]
    return f"DOC_{doc_id}_IDX_{idx}_H_{h}"

# -----------------------------
# 1) chunking：把长文本按语义切成 chunk（带 overlap），注意此处文本必须为一篇完整的文章，否则idx会乱
# TODO：考虑优化，毕竟如果文本太大，一次性加载会占用过大的内存
# -----------------------------
# 如果text是个字符串数组，那么返回的会是二维数组，如果是个字符串，那返回的就是一个一维数组
async def chunk_document(doc_id: int) -> list[ChunkInfo]:
    db = SessionLocal()
    db_document = crud.document.get_document_by_document_id(db=db,
                                                            document_id=doc_id)
    if db_document is None:
        raise Exception("Document not found")
    db_user = crud.user.get_user_by_id(db=db, 
                                       user_id=db_document.creator_id)
    if db_user is None:
        raise Exception("User does not exist")
    remote_file_service = await get_user_remote_file_system(user_id=db_user.id)
    await remote_file_service.init_client_by_user_file_system_id(user_file_system_id=db_user.default_user_file_system)
    
    if db_document.category == DocumentCategory.WEBSITE:
        website_document = crud.document.get_website_document_by_document_id(db=db,
                                                                            document_id=doc_id)
        if website_document is None:
            raise Exception("Website document not found")
        markdown_content = await remote_file_service.get_file_content_by_file_path(file_path=website_document.md_file_name)
    if db_document.category == DocumentCategory.FILE:
        file_document = crud.document.get_file_document_by_document_id(db=db,
                                                                    document_id=doc_id)
        if file_document is None:
            raise Exception("Website document not found")
        markdown_content = await remote_file_service.get_file_content_by_file_path(file_path=file_document.md_file_name)
    if db_document.category == DocumentCategory.QUICK_NOTE:
        quick_note_document = crud.document.get_quick_note_document_by_document_id(db=db,
                                                                                   document_id=doc_id)
        markdown_content = quick_note_document.content
        
    chunk_infos: list[ChunkInfo] = []
    embedding_model = AutoEmbeddings.get_embeddings("Qwen/Qwen3-Embedding-0.6B")
    chunker = SemanticChunker(embedding_model=embedding_model,
                              threshold=0.8,
                              chunk_size=1024,
                              similarity_window=3,
                              skip_window=2)
    chunks = cast(list[Chunk], chunker(markdown_content))
    for idx, chunk in enumerate(chunks):
        chunk_info: ChunkInfo = ChunkInfo(id=chunk.id, 
                                          text=chunk.text, 
                                          idx=idx, 
                                          doc_id=doc_id)
        chunk_info.id = make_chunk_id(doc_id=doc_id, idx=idx, text=chunk.text)
        chunk_info.idx = idx
        chunk_info.doc_id = doc_id
        chunk_infos.append(chunk_info)
    db.close()
    return chunk_infos

# -----------------------------
# 2) embedding text：把 chunk 的文本内容转为向量
# -----------------------------
def embedding_chunks(chunks: list[ChunkInfo]) -> list[ChunkInfo]:
    embedding_model = SentenceTransformer("Qwen/Qwen3-Embedding-0.6B")
    for chunk in chunks:
        embedding = embedding_model.encode(chunk.text)
        chunk.embedding = embedding.tolist()
    return chunks


# ----------------------------
# 5) 调用 LLM 抽取实体和关系
# ----------------------------
def extract_entities_relations(llm_client: openai.OpenAI, chunk: ChunkInfo) -> tuple[list[EntityInfo], list[RelationInfo]]:
    """
    调用 LLM 模型抽取实体与关系
    """
    prompt = entity_and_relation_extraction_prompt(chunk=chunk)
    resp = llm_client.chat.completions.create(
        model="kimi-latest",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.0,
        response_format={"type": "json_object"},
    )
    output_text = resp.choices[0].message.content
    if output_text is None:
        data = {"entities": [], "relations": []}
    else:
        try:
            data = json.loads(output_text)
        except:
            data = {"entities": [], "relations": []}

    entities = [
        EntityInfo(
            id=e['id'],
            text=e['text'],
            chunks=[chunk.id],
            entity_type=e['entity_type']
        ) for e in data.get("entities", [])
    ]
    relations = [
        RelationInfo(
            src_node=r["src_entity_id"],
            tgt_node=r["tgt_entity_id"],
            relation_type=r["relation_type"]
        ) for r in data.get("relations", [])
    ]
    return entities, relations

# -----------------------------
# 6) 合并实体和关系
# -----------------------------
def merge_entitys_and_relations(
    entities: list[EntityInfo], 
    relations: list[RelationInfo]
) -> tuple[list[EntityInfo], list[RelationInfo]]:
    seen_entities: dict[tuple[str, str], EntityInfo] = {}
    dedup_entities: list[EntityInfo] = []

    for e in entities:
        key = (e.entity_type, e.text)
        if key not in seen_entities:
            # 初始化 chunks
            if not hasattr(e, "chunks") or e.chunks is None:
                e.chunks = []
            else:
                e.chunks = list(set(e.chunks))
            seen_entities[key] = e
            dedup_entities.append(e)
        else:
            dedup_e = seen_entities[key]
            if hasattr(e, "chunks") and e.chunks:
                dedup_e.chunks.extend(e.chunks)
                dedup_e.chunks = list(set(dedup_e.chunks))

    # -------- relations 去重 ----------
    seen_relations: set[tuple[str, str, str]] = set()
    dedup_relations: list[RelationInfo] = []
    for r in relations:
        key = (r.src_node, r.relation_type, r.tgt_node)
        if key not in seen_relations:
            seen_relations.add(key)
            dedup_relations.append(r)

    return dedup_entities, dedup_relations

def get_extract_llm_client(user_id: int) -> openai.OpenAI:
    db = SessionLocal()
    db_user = crud.user.get_user_by_id(db=db, 
                                       user_id=user_id)
    db = SessionLocal()
    db_model = crud.model.get_ai_model_by_id(db=db, 
                                             model_id=db_user.default_document_reader_model_id)
    db_user_model = crud.model.get_user_ai_model_by_id_decrypted(db=db, 
                                                                 user_id=user_id, 
                                                                 model_id=db_user.default_document_reader_model_id)
    if db_model is None:
        raise Exception("Model not found")
    if db_user_model is None:
        raise Exception("User model not found")
    db_model_provider = crud.model.get_ai_model_provider_by_id(db=db, 
                                                               provider_id=db_model.provider_id)
    db_user_model_provider = crud.model.get_user_ai_model_provider_by_id_decrypted(db=db, 
                                                                                   user_id=user_id, 
                                                                                   provider_id=db_model.provider_id)
    if db_model_provider is None:
        raise Exception("Model provider not found")
    if db_user_model_provider is None:
        raise Exception("User model provider not found")
    llm_client = openai.OpenAI(
        api_key=db_user_model.api_key if db_user_model.api_key else db_user_model_provider.api_key,
        base_url=db_user_model.api_url if db_user_model.api_url else db_user_model_provider.api_url,
    )
    db.close()
    return llm_client
 
async def process_document(user_id: int, doc_id: int):
    db = SessionLocal()
    llm_client = get_extract_llm_client(user_id=user_id)
    db_doc = crud.document.get_document_by_document_id(db=db,
                                                       document_id=doc_id)
    if db_doc is None:
        raise Exception("Document not found")
    
    upsert_doc_neo4j(docs_info=[DocumentInfo(id=db_doc.id,
                                             title=db_doc.title,
                                             description=db_doc.description,
                                             creator_id=db_doc.creator_id,
                                             updated_at=db_doc.update_time,
                                             created_at=db_doc.create_time)])
    chunks = await chunk_document(doc_id=doc_id)
    embedding_chunks(chunks)
    upsert_milvus(user_id=user_id,
                  chunks_info=chunks)
    upsert_chunks_neo4j(chunks)
    upsert_doc_chunk_relations()
    entities = []
    relations = []
    for chunk in chunks:
        sub_entities, sub_relations = extract_entities_relations(llm_client=llm_client, 
                                                                 chunk=chunk)
        entities.extend(sub_entities)
        relations.extend(sub_relations)
    entities, relations = merge_entitys_and_relations(entities, relations)
    upsert_entities_neo4j(entities)
    upsert_relations_neo4j(relations)
    upsert_chunk_entity_relations()
    create_communities_from_chunks()
    create_community_nodes_and_relationships_with_size()
    annotate_node_degrees()