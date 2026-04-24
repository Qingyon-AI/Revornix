import hashlib

import crud
import models
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Session

from common.logger import exception_logger, format_log_message
from enums.document import (
    DocumentAudioTranscribeStatus,
    DocumentCategory,
    DocumentMdConvertStatus,
)
from proxy.file_system_proxy import FileSystemProxy


CHUNK_SNAPSHOT_ROOT = ".cache/document-chunks"


def _hash_source_signature(source: str) -> str:
    return hashlib.sha256(source.encode("utf-8")).hexdigest()[:24]


def _is_remote_file_missing_error(error: Exception) -> bool:
    response = getattr(error, "response", None)
    if isinstance(response, dict):
        error_payload = response.get("Error", {})
        if isinstance(error_payload, dict):
            code = error_payload.get("Code")
            if isinstance(code, str) and code in {"NoSuchKey", "NoSuchObject", "NotFound", "404"}:
                return True

        metadata = response.get("ResponseMetadata", {})
        if isinstance(metadata, dict) and metadata.get("HTTPStatusCode") == 404:
            return True

    message = str(error).lower()
    return (
        "nosuchkey" in message
        or "no such key" in message
        or "specified key does not exist" in message
    )


def _snapshot_paths(document_id: int, source_signature: str) -> tuple[str, str]:
    base_path = f"{CHUNK_SNAPSHOT_ROOT}/{document_id}/{source_signature}"
    return (
        f"{base_path}.chunks.jsonl.gz",
        f"{base_path}.meta.json",
    )


def _resolve_document_snapshot_paths(
    *,
    db: Session,
    document: models.document.Document,
) -> tuple[int, list[str]] | None:
    source_signature: str | None = None
    if document.category == DocumentCategory.WEBSITE or document.category == DocumentCategory.FILE:
        convert_task = crud.task.get_document_convert_task_by_document_id(
            db=db,
            document_id=document.id,
        )
        if convert_task is None or convert_task.status != DocumentMdConvertStatus.SUCCESS or convert_task.md_file_name is None:
            return None
        source_signature = _hash_source_signature(
            f"{document.category}:{convert_task.md_file_name}"
        )
    elif document.category == DocumentCategory.QUICK_NOTE:
        quick_note_document = crud.document.get_quick_note_document_by_document_id(
            db=db,
            document_id=document.id,
        )
        if quick_note_document is None or quick_note_document.content is None:
            return None
        source_signature = _hash_source_signature(
            f"{document.category}:{hashlib.sha256(quick_note_document.content.encode('utf-8')).hexdigest()}"
        )
    elif document.category == DocumentCategory.AUDIO:
        transcribe_task = crud.task.get_document_audio_transcribe_task_by_document_id(
            db=db,
            document_id=document.id,
        )
        if transcribe_task is None or transcribe_task.status != DocumentAudioTranscribeStatus.SUCCESS or transcribe_task.transcribed_text is None:
            return None
        source_signature = _hash_source_signature(
            f"{document.category}:{hashlib.sha256(transcribe_task.transcribed_text.encode('utf-8')).hexdigest()}"
        )

    if source_signature is None:
        return None

    chunk_path, meta_path = _snapshot_paths(document.id, source_signature)
    return document.creator_id, [chunk_path, meta_path]

async def _resolve_document_snapshot_paths_async(
    *,
    db: AsyncSession,
    document: models.document.Document,
) -> tuple[int, list[str]] | None:
    source_signature: str | None = None
    if document.category == DocumentCategory.WEBSITE or document.category == DocumentCategory.FILE:
        convert_task = await crud.task.get_document_convert_task_by_document_id_async(
            db=db,
            document_id=document.id,
        )
        if convert_task is None or convert_task.status != DocumentMdConvertStatus.SUCCESS or convert_task.md_file_name is None:
            return None
        source_signature = _hash_source_signature(
            f"{document.category}:{convert_task.md_file_name}"
        )
    elif document.category == DocumentCategory.QUICK_NOTE:
        quick_note_document = await crud.document.get_quick_note_document_by_document_id_async(
            db=db,
            document_id=document.id,
        )
        if quick_note_document is None or quick_note_document.content is None:
            return None
        source_signature = _hash_source_signature(
            f"{document.category}:{hashlib.sha256(quick_note_document.content.encode('utf-8')).hexdigest()}"
        )
    elif document.category == DocumentCategory.AUDIO:
        transcribe_task = await crud.task.get_document_audio_transcribe_task_by_document_id_async(
            db=db,
            document_id=document.id,
        )
        if transcribe_task is None or transcribe_task.status != DocumentAudioTranscribeStatus.SUCCESS or transcribe_task.transcribed_text is None:
            return None
        source_signature = _hash_source_signature(
            f"{document.category}:{hashlib.sha256(transcribe_task.transcribed_text.encode('utf-8')).hexdigest()}"
        )

    if source_signature is None:
        return None

    chunk_path, meta_path = _snapshot_paths(document.id, source_signature)
    return document.creator_id, [chunk_path, meta_path]


async def delete_document_chunk_snapshots(
    *,
    db: Session | AsyncSession,
    documents: list[models.document.Document],
) -> None:
    file_services: dict[int, object] = {}
    for document in documents:
        if isinstance(db, AsyncSession):
            resolved = await _resolve_document_snapshot_paths_async(
                db=db,
                document=document,
            )
        else:
            resolved = _resolve_document_snapshot_paths(
                db=db,
                document=document,
            )
        if resolved is None:
            continue
        creator_id, paths = resolved
        try:
            file_service = file_services.get(creator_id)
            if file_service is None:
                file_service = await FileSystemProxy.create(user_id=creator_id)
                file_services[creator_id] = file_service
            for path in paths:
                try:
                    await file_service.delete_file(path)
                except Exception as error:
                    if _is_remote_file_missing_error(error):
                        continue
                    exception_logger.warning(
                        format_log_message(
                            "document_chunk_snapshot_delete_failed",
                            document_id=document.id,
                            creator_id=creator_id,
                            path=path,
                            error=error,
                        )
                    )
        except Exception as error:
            exception_logger.warning(
                format_log_message(
                    "document_chunk_snapshot_cleanup_init_failed",
                    document_id=document.id,
                    creator_id=document.creator_id,
                    error=error,
                )
            )
