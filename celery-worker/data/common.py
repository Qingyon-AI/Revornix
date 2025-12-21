import crud
import hashlib
import json
import asyncio
import torch
import models
from typing import cast
from langfuse.openai import OpenAI
from langfuse import propagate_attributes
from enums.document import DocumentMdConvertStatus
from chonkie.types import Chunk
from chonkie.chunker.recursive import RecursiveChunker
from enums.document import DocumentCategory
from common.common import get_user_remote_file_system
from data.sql.base import SessionLocal
from data.custom_types.all import *
from prompts.entity_and_relation_extraction import entity_and_relation_extraction_prompt
from typing import AsyncGenerator
from sqlalchemy.orm import Session
from protocol.remote_file_service import RemoteFileServiceProtocol
from proxy.ai_model_proxy import AIModelProxy

def make_chunk_id(
    doc_id: int, 
    idx: int, 
text: str) -> str:
    h = hashlib.sha256(text.encode("utf-8")).hexdigest()[:16]
    return f"DOC_{doc_id}_IDX_{idx}_H_{h}"

# -----------------------------
# chunking：把长文本按语义切成 chunk（带 overlap），注意此处文本必须为一篇完整的文章，否则idx会乱
# -----------------------------
async def stream_chunk_document(
    doc_id: int
) -> AsyncGenerator[ChunkInfo, None]:
    """
    以流式方式生成 ChunkInfo，避免一次性 embedding 占用大量内存
    """
    db = SessionLocal()
    try:
        # 1️⃣ 获取文档与用户
        db_document = crud.document.get_document_by_document_id(
            db=db, 
            document_id=doc_id
        )
        if db_document is None:
            raise ValueError("Document not found")
        db_user = crud.user.get_user_by_id(
            db=db, 
            user_id=db_document.creator_id
        )
        if db_user is None:
            raise ValueError("User not found")
        if db_user.default_user_file_system is None:
            raise ValueError("User default file system not found")
        
        # 2️⃣ 初始化文件系统
        remote_file_service = await get_user_remote_file_system(
            user_id=db_user.id
        )
        await remote_file_service.init_client_by_user_file_system_id(
            db_user.default_user_file_system
        )

        # 3️⃣ 获取 Markdown 内容
        markdown_content = await _load_markdown_content(
            db, 
            db_document, 
            remote_file_service
        )
        if not markdown_content.strip():
            raise ValueError("Document content is empty")

        chunker = RecursiveChunker.from_recipe("markdown")


        # 5️⃣ 按段切大文本，分步生成 chunk
        segment_size = 100_000  # 每次处理约 10 万字符
        segments = [
            markdown_content[i:i + segment_size]
            for i in range(0, len(markdown_content), segment_size)
        ]

        global_idx = 0
        for seg_idx, segment in enumerate(segments):
            # ✅ 在后台线程中执行 CPU 密集的 chunking
            raw_chunks = await asyncio.to_thread(chunker, segment)

            # 展平成一维 List[Chunk]
            chunks: list[Chunk] = [
                c
                for group in raw_chunks
                for c in (group if isinstance(group, list) else [group])
            ]

            for idx, chunk in enumerate(chunks):
                chunk_info = ChunkInfo(
                    id=make_chunk_id(doc_id=doc_id, idx=global_idx, text=chunk.text),
                    text=chunk.text,
                    idx=global_idx,
                    doc_id=doc_id,
                )
                yield chunk_info
                global_idx += 1

            # ✅ 每批后释放 GPU 显存
            if torch.backends.mps.is_available():
                torch.mps.empty_cache()
            elif torch.cuda.is_available():
                torch.cuda.empty_cache()

    finally:
        db.close()


# -----------------------------
# 工具函数：加载 Markdown 内容
# -----------------------------
async def _load_markdown_content(
    db: Session, 
    db_document: models.document.Document, 
    remote_file_service: RemoteFileServiceProtocol
) -> str:
    """根据文档类型加载内容"""
    cat = db_document.category
    if cat == DocumentCategory.WEBSITE or cat == DocumentCategory.FILE:
        convert_task = crud.task.get_document_convert_task_by_document_id(
            db=db, 
            document_id=db_document.id
        )
        if convert_task is None:
            raise ValueError("The convert task of the document is not found")
        if convert_task.status != DocumentMdConvertStatus.SUCCESS or convert_task.md_file_name is None:
            raise ValueError("The convert task of the document is not finished")
        return cast(str, await remote_file_service.get_file_content_by_file_path(
            file_path=convert_task.md_file_name
        ))
    elif cat == DocumentCategory.QUICK_NOTE:
        note = crud.document.get_quick_note_document_by_document_id(
            db=db, 
            document_id=db_document.id
        )
        if note is None:
            raise ValueError("Quick note document not found")
        return note.content or ""
    else:
        raise ValueError(f"Unsupported document category: {cat}")


# ----------------------------
# 调用 LLM 抽取实体和关系
# ----------------------------
def extract_entities_relations(
    user_id: int,
    llm_client: OpenAI, 
    llm_model: str,
    chunk: ChunkInfo
) -> tuple[list[EntityInfo], list[RelationInfo]]:
    """
    调用 LLM 模型抽取实体与关系
    """
    prompt = entity_and_relation_extraction_prompt(chunk=chunk)
    with propagate_attributes(user_id=str(user_id)):
        resp = llm_client.chat.completions.create(
            model=llm_model,
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
# 合并实体和关系
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

async def get_extract_llm_client(
    user_id: int
) -> OpenAI:
    db = SessionLocal()
    db_user = crud.user.get_user_by_id(
        db=db, 
        user_id=user_id
    )
    if db_user is None:
        raise Exception("User not found")
    if db_user.default_document_reader_model_id is None:
        raise Exception("Default document reader model id not found")
    
    model_configuration = (await AIModelProxy.create(
        user_id=user_id,
        model_id=db_user.default_document_reader_model_id
    )).get_configuration()
    
    llm_client = OpenAI(
        api_key=model_configuration.api_key,
        base_url=model_configuration.base_url,
    )
    db.close()
    return llm_client
