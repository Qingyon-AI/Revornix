import crud
import json
import hashlib
import asyncio
import time
import torch
import models
from typing import cast
from langfuse.openai import OpenAI
from common.logger import exception_logger
from langfuse import propagate_attributes
from enums.document import DocumentMdConvertStatus, DocumentAudioTranscribeStatus
from chonkie.types import Chunk
from chonkie.chunker.recursive import RecursiveChunker
from enums.document import DocumentCategory
from data.sql.base import session_scope
from data.custom_types.all import RelationInfo, EntityInfo, ChunkInfo
from common.document_guard import ensure_document_active
from prompts.entity_and_relation_extraction import entity_and_relation_extraction_prompt
from typing import AsyncGenerator
from sqlalchemy.orm import Session
from protocol.remote_file_service import RemoteFileServiceProtocol
from proxy.ai_model_proxy import AIModelProxy
from proxy.file_system_proxy import FileSystemProxy

def make_chunk_id(
    doc_id: int, 
    idx: int,
    text: str
) -> str:
    h = hashlib.sha256(text.encode("utf-8")).hexdigest()[:16]
    return f"DOC_{doc_id}_IDX_{idx}_H_{h}"

def _normalize_context_text(text: str) -> str:
    return " ".join(text.split()).strip().lower()

def make_context_hash(text: str) -> str:
    normalized = _normalize_context_text(text)
    return hashlib.sha256(normalized.encode("utf-8")).hexdigest()[:16]

def make_entity_id(entity_type: str, text: str, context_hash: str) -> str:
    key = f"{entity_type}|{text}|{context_hash}"
    return f"ENT_{hashlib.sha256(key.encode('utf-8')).hexdigest()[:16]}"

def _extract_entity_context_sample(text: str, entity_text: str, window: int = 200, max_len: int = 512) -> str:
    if not text:
        return ""
    lower_text = text.lower()
    lower_entity = entity_text.lower()
    idx = lower_text.find(lower_entity) if entity_text else -1
    if idx >= 0:
        start = max(0, idx - window)
        end = min(len(text), idx + len(entity_text) + window)
        sample = text[start:end]
    else:
        sample = text
    return sample[:max_len]

def _cosine_similarity(a: list[float], b: list[float]) -> float:
    if not a or not b or len(a) != len(b):
        return -1.0
    try:
        import numpy as np
        va = np.asarray(a, dtype=np.float32)
        vb = np.asarray(b, dtype=np.float32)
        denom = np.linalg.norm(va) * np.linalg.norm(vb)
        if denom == 0.0:
            return -1.0
        return float(np.dot(va, vb) / denom)
    except Exception:
        dot = 0.0
        norm_a = 0.0
        norm_b = 0.0
        for x, y in zip(a, b):
            dot += x * y
            norm_a += x * x
            norm_b += y * y
        if norm_a == 0.0 or norm_b == 0.0:
            return -1.0
        return dot / ((norm_a ** 0.5) * (norm_b ** 0.5))

def _llm_semantic_match(
    *,
    llm_client: OpenAI,
    llm_model: str,
    entity_text: str,
    entity_type: str,
    context_a: str,
    context_b: str,
) -> bool:
    prompt = f"""
You are judging whether the same term refers to the same meaning in two contexts.
Term: {entity_text}
Type: {entity_type}

Context A:
{context_a}

Context B:
{context_b}

Return strict JSON only:
{{"same": true}} or {{"same": false}}
"""
    try:
        resp = llm_client.chat.completions.create(
            model=llm_model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.0,
            response_format={"type": "json_object"},
            max_tokens=256,
        )
        content = resp.choices[0].message.content or ""
        data = json.loads(content)
        return bool(data.get("same"))
    except Exception as e:
        exception_logger.error(f"LLM semantic match failed: {e}")
        return False

# -----------------------------
# chunking：把长文本按语义切成 chunk（带 overlap），注意此处文本必须为一篇完整的文章，否则idx会乱
# -----------------------------
async def stream_chunk_document(
    doc_id: int
) -> AsyncGenerator[ChunkInfo, None]:
    """
    以流式方式生成 ChunkInfo，避免一次性 embedding 占用大量内存
    """
    db = session_scope()
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
        remote_file_service = await FileSystemProxy.create(
            user_id=db_user.id
        )

        # 3️⃣ 获取 Markdown 内容
        markdown_content = await _load_markdown_content(
            db, 
            db_document, 
            remote_file_service
        )
        
        if not markdown_content.strip():
            raise ValueError("Document content is empty")

        # TODO 优化chunk 应该根据文档实际类型有区分，不能一刀切用markdown
        chunker = RecursiveChunker.from_recipe("markdown")

        # 5️⃣ 按段切大文本，分步生成 chunk
        segment_size = 100_000  # 每次处理约 10 万字符
        segments = [
            markdown_content[i:i + segment_size]
            for i in range(0, len(markdown_content), segment_size)
        ]

        global_idx = 0
        last_check = 0.0
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
                now = time.monotonic()
                if now - last_check >= 2.0:
                    ensure_document_active(db=db, document_id=doc_id)
                    last_check = now
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
    except Exception as e:
        exception_logger.error(f"Error while streaming chunk document: {e}")
        raise
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
    elif cat == DocumentCategory.AUDIO:
        transcribe_task = crud.task.get_document_audio_transcribe_task_by_document_id(
            db=db, 
            document_id=db_document.id
        )
        if transcribe_task is None:
            raise ValueError("The transcribe task of the document is not found")
        if transcribe_task.status != DocumentAudioTranscribeStatus.SUCCESS or transcribe_task.transcribed_text is None:
            raise ValueError("The transcribe task of the document is not finished")
        return transcribe_task.transcribed_text
    else:
        raise ValueError(f"Unsupported document category: {cat}")


# ----------------------------
# 调用 LLM 抽取实体和关系
# ----------------------------
def extract_entities_relations(
    user_id: int,
    llm_client: OpenAI,
    llm_model: str,
    chunk: ChunkInfo,
    max_continue_rounds: int = 8,   # 防止死循环
) -> tuple[list[EntityInfo], list[RelationInfo]]:
    """
    调用 LLM 模型抽取实体与关系（支持自动续写直到完成）
    """

    prompt = entity_and_relation_extraction_prompt(chunk=chunk)

    output_text = ""
    rounds = 0

    with propagate_attributes(
        user_id=str(user_id),
        tags=[f"model:{llm_model}"]
    ):
        # 第一轮
        resp = llm_client.chat.completions.create(
            model=llm_model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.0,
            response_format={"type": "json_object"},
            max_tokens=8192,
        )

        choice = resp.choices[0]
        output_text += choice.message.content or ""

        # === 循环续写 ===
        while (
            choice.finish_reason == "length"
            and llm_model.startswith("kimi")
            and rounds < max_continue_rounds
        ):
            rounds += 1

            resp = llm_client.chat.completions.create(
                model=llm_model,
                messages=[
                    {"role": "user", "content": prompt},
                    {
                        "role": "assistant",
                        "content": output_text,
                        "partial": True,  # kimi 专用
                    },
                ],
                temperature=0.0,
                max_tokens=8192,
            )

            choice = resp.choices[0]
            output_text += choice.message.content or ""

        if rounds >= max_continue_rounds:
            exception_logger.error(
                f"LLM output truncated after {max_continue_rounds} continuation rounds"
            )
    # === JSON 解析 ===
    if not output_text:
        data = {"entities": [], "relations": []}
    else:
        try:
            data = json.loads(output_text)
        except json.JSONDecodeError as e:
            exception_logger.error(f"Failed to decode JSON: {e}")
            data = {"entities": [], "relations": []}

    # === 结构化 ===
    entities = [
        EntityInfo(
            id=e["id"],
            text=e["text"],
            chunks=[chunk.id],
            entity_type=e["entity_type"],
        )
        for e in data.get("entities", [])
    ]

    relations = [
        RelationInfo(
            src_node=r["src_entity_id"],
            tgt_node=r["tgt_entity_id"],
            relation_type=r["relation_type"],
        )
        for r in data.get("relations", [])
    ]

    return entities, relations

# -----------------------------
# 合并实体和关系
# -----------------------------
def merge_entitys_and_relations(
    entities: list[EntityInfo], 
    relations: list[RelationInfo]
) -> tuple[list[EntityInfo], list[RelationInfo]]:
    seen_entities: dict[tuple[str, str, str | None], EntityInfo] = {}
    dedup_entities: list[EntityInfo] = []

    for e in entities:
        key = (e.entity_type, e.text, e.context_hash)
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

def filter_entities_relations_by_context_consistency(
    entities: list[EntityInfo],
    relations: list[RelationInfo],
    context_index: dict[tuple[str, str], str],
    existing_context_index: dict[tuple[str, str], set[str | None]] | None = None,
) -> tuple[list[EntityInfo], list[RelationInfo]]:
    allowed_ids: set[str] = set()
    filtered_entities: list[EntityInfo] = []
    if existing_context_index is None:
        existing_context_index = {}

    for e in entities:
        key = (e.entity_type, e.text)
        context_hash = e.context_hash or ""
        existing_hashes = existing_context_index.get(key)
        if existing_hashes:
            if any(h is None or h == "" for h in existing_hashes):
                continue
            if any(h != context_hash for h in existing_hashes):
                continue
        existing = context_index.get(key)
        if existing is None:
            context_index[key] = context_hash
        elif existing != context_hash:
            continue
        filtered_entities.append(e)
        allowed_ids.add(e.id)
        if key not in existing_context_index:
            existing_context_index[key] = {context_hash}
        else:
            existing_context_index[key].add(context_hash)

    filtered_relations = [
        r for r in relations
        if r.src_node in allowed_ids and r.tgt_node in allowed_ids
    ]
    return filtered_entities, filtered_relations

def resolve_entities_with_semantic_dedupe(
    *,
    entities: list[EntityInfo],
    relations: list[RelationInfo],
    chunk_text: str,
    existing_entities_index: dict[tuple[str, str], list[dict]],
    embedding_engine,
    llm_client: OpenAI,
    llm_model: str,
    similarity_high: float = 0.85,
    similarity_low: float = 0.7,
) -> tuple[list[EntityInfo], list[RelationInfo]]:
    if not entities:
        return [], []

    context_samples = [
        _extract_entity_context_sample(chunk_text, e.text)
        for e in entities
    ]
    embeddings: list = []
    if context_samples:
        max_batch = 10
        for i in range(0, len(context_samples), max_batch):
            batch = context_samples[i:i + max_batch]
            batch_vecs = embedding_engine.embed(batch)
            if hasattr(batch_vecs, "tolist"):
                batch_vecs = batch_vecs.tolist()
            embeddings.extend(list(batch_vecs))

    id_map: dict[str, str] = {}
    resolved_entities: list[EntityInfo] = []

    for e, sample, emb in zip(entities, context_samples, embeddings):
        original_id = e.id
        key = (e.entity_type, e.text)
        candidates = existing_entities_index.get(key, [])

        emb_list = emb.tolist() if hasattr(emb, "tolist") else list(emb)

        best_candidate = None
        best_sim = -1.0
        for c in candidates:
            c_emb = c.get("context_embedding")
            if not c_emb:
                continue
            sim = _cosine_similarity(emb_list, c_emb)
            if sim > best_sim:
                best_sim = sim
                best_candidate = c

        match = None
        if best_candidate and best_sim >= similarity_high:
            match = best_candidate
        elif best_candidate and best_sim >= similarity_low:
            c_sample = best_candidate.get("context_sample") or ""
            if c_sample:
                same = _llm_semantic_match(
                    llm_client=llm_client,
                    llm_model=llm_model,
                    entity_text=e.text,
                    entity_type=e.entity_type,
                    context_a=c_sample,
                    context_b=sample,
                )
                if same:
                    match = best_candidate
        elif not best_candidate and candidates:
            c_sample = None
            for c in candidates:
                if c.get("context_sample"):
                    c_sample = c["context_sample"]
                    best_candidate = c
                    break
            if c_sample:
                same = _llm_semantic_match(
                    llm_client=llm_client,
                    llm_model=llm_model,
                    entity_text=e.text,
                    entity_type=e.entity_type,
                    context_a=c_sample,
                    context_b=sample,
                )
                if same:
                    match = best_candidate

        if match:
            canonical_id = match.get("id")
            context_hash = match.get("context_hash") or make_context_hash(sample)
            if not match.get("context_hash"):
                match["context_hash"] = context_hash
            if not match.get("context_sample"):
                match["context_sample"] = sample
            if not match.get("context_embedding"):
                match["context_embedding"] = emb_list
        else:
            context_hash = make_context_hash(sample)
            canonical_id = make_entity_id(e.entity_type, e.text, context_hash)
            existing_entities_index.setdefault(key, []).append(
                {
                    "id": canonical_id,
                    "context_hash": context_hash,
                    "context_sample": sample,
                    "context_embedding": emb_list,
                }
            )

        e.id = canonical_id
        e.context_hash = context_hash
        e.context_sample = sample
        e.context_embedding = emb_list
        resolved_entities.append(e)
        id_map[original_id] = canonical_id

    resolved_relations: list[RelationInfo] = []
    for r in relations:
        src = id_map.get(r.src_node)
        tgt = id_map.get(r.tgt_node)
        if src is None or tgt is None:
            continue
        resolved_relations.append(
            RelationInfo(
                src_node=src,
                tgt_node=tgt,
                relation_type=r.relation_type,
            )
        )

    return resolved_entities, resolved_relations

async def get_extract_llm_client(
    user_id: int
) -> OpenAI:
    db = session_scope()
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
