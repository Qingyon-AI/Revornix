import hashlib

import crud
import models
from sqlalchemy.ext.asyncio import AsyncSession

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


def _snapshot_paths(document_id: int, source_signature: str) -> tuple[str, str]:
    base_path = f"{CHUNK_SNAPSHOT_ROOT}/{document_id}/{source_signature}"
    return (
        f"{base_path}.chunks.jsonl.gz",
        f"{base_path}.meta.json",
    )


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


def _dedupe_paths(paths: list[str]) -> list[str]:
    seen: set[str] = set()
    deduped: list[str] = []
    for path in paths:
        if path and path not in seen:
            seen.add(path)
            deduped.append(path)
    return deduped


async def _collect_document_remote_paths_async(
    *,
    db: AsyncSession,
    document: models.document.Document,
) -> list[str]:
    """Collect every remote-storage object owned by ``document``.

    Unlike chunk-snapshot resolution, content files are gathered regardless of
    task status: a half-processed document may still have uploaded its original
    file or partial artefacts, and those must be removed too.
    """
    paths: list[str] = []
    # The md file used to derive the chunk-snapshot signature; only the
    # SUCCESS-state markdown produces a snapshot, so we track it separately.
    snapshot_md_file_name: str | None = None
    category = document.category

    if category in (DocumentCategory.WEBSITE, DocumentCategory.FILE):
        convert_task = await crud.task.get_document_convert_task_by_document_id_async(
            db=db,
            document_id=document.id,
        )
        if convert_task is not None and convert_task.md_file_name:
            paths.append(convert_task.md_file_name)
            if convert_task.status == DocumentMdConvertStatus.SUCCESS:
                snapshot_md_file_name = convert_task.md_file_name

    if category == DocumentCategory.FILE:
        file_document = await crud.document.get_file_document_by_document_id_async(
            db=db,
            document_id=document.id,
        )
        if file_document is not None and file_document.file_name:
            paths.append(file_document.file_name)

    if category == DocumentCategory.WEBSITE:
        snapshots = await crud.document.get_website_document_snapshots_by_document_id_async(
            db=db,
            document_id=document.id,
        )
        for snapshot in snapshots:
            if snapshot.md_file_name:
                paths.append(snapshot.md_file_name)

    if category == DocumentCategory.QUICK_NOTE:
        quick_note_document = await crud.document.get_quick_note_document_by_document_id_async(
            db=db,
            document_id=document.id,
        )
        if quick_note_document is not None and quick_note_document.md_file_name:
            paths.append(quick_note_document.md_file_name)
            snapshot_md_file_name = quick_note_document.md_file_name

    if category == DocumentCategory.AUDIO:
        audio_document = await crud.document.get_audio_document_by_document_id_async(
            db=db,
            document_id=document.id,
        )
        if audio_document is not None and audio_document.audio_file_name:
            paths.append(audio_document.audio_file_name)
        transcribe_task = await crud.task.get_document_audio_transcribe_task_by_document_id_async(
            db=db,
            document_id=document.id,
        )
        if transcribe_task is not None:
            if transcribe_task.md_file_name:
                paths.append(transcribe_task.md_file_name)
                if transcribe_task.status == DocumentAudioTranscribeStatus.SUCCESS:
                    snapshot_md_file_name = transcribe_task.md_file_name
            if transcribe_task.segments_file_name:
                paths.append(transcribe_task.segments_file_name)

    podcast_task = await crud.task.get_document_podcast_task_by_document_id_async(
        db=db,
        document_id=document.id,
    )
    if podcast_task is not None:
        if podcast_task.podcast_file_name:
            paths.append(podcast_task.podcast_file_name)
        if podcast_task.podcast_script_file_name:
            paths.append(podcast_task.podcast_script_file_name)

    if snapshot_md_file_name is not None:
        source_signature = _hash_source_signature(
            f"{category}:{snapshot_md_file_name}"
        )
        chunk_path, meta_path = _snapshot_paths(document.id, source_signature)
        paths.extend([chunk_path, meta_path])

    return _dedupe_paths(paths)


async def _collect_section_remote_paths_async(
    *,
    db: AsyncSession,
    section: models.section.Section,
) -> list[str]:
    paths: list[str] = []
    if section.md_file_name:
        paths.append(section.md_file_name)
    podcast_task = await crud.task.get_section_podcast_task_by_section_id_async(
        db=db,
        section_id=section.id,
    )
    if podcast_task is not None:
        if podcast_task.podcast_file_name:
            paths.append(podcast_task.podcast_file_name)
        if podcast_task.podcast_script_file_name:
            paths.append(podcast_task.podcast_script_file_name)
    return _dedupe_paths(paths)


async def _delete_remote_paths_for_owner(
    *,
    db: AsyncSession,
    owner_user_id: int,
    paths: list[str],
    log_scope: str,
    file_services: dict[int, object],
) -> None:
    """Physically delete ``paths`` from ``owner_user_id``'s file system and
    soft-delete the matching ``StoredFile`` inventory rows.

    Missing remote objects are tolerated; any other per-file failure is logged
    but never aborts the surrounding deletion flow.
    """
    if not paths:
        return
    try:
        file_service = file_services.get(owner_user_id)
        if file_service is None:
            file_service = await FileSystemProxy.create(user_id=owner_user_id)
            file_services[owner_user_id] = file_service
        for path in paths:
            try:
                await file_service.delete_file(path)
            except Exception as error:
                if _is_remote_file_missing_error(error):
                    continue
                exception_logger.warning(
                    format_log_message(
                        f"{log_scope}_delete_failed",
                        owner_user_id=owner_user_id,
                        path=path,
                        error=error,
                    )
                )
        await crud.file_system.soft_delete_stored_files_by_owner_paths_async(
            db=db,
            owner_user_id=owner_user_id,
            paths=paths,
        )
    except Exception as error:
        exception_logger.warning(
            format_log_message(
                f"{log_scope}_cleanup_init_failed",
                owner_user_id=owner_user_id,
                error=error,
            )
        )


async def delete_document_remote_files(
    *,
    db: AsyncSession,
    documents: list[models.document.Document],
) -> None:
    """Physically delete every remote-storage object owned by ``documents``
    (markdown, original upload, audio, transcript segments, podcast, website
    snapshots and chunk-snapshot caches), plus their inventory rows."""
    file_services: dict[int, object] = {}
    for document in documents:
        paths = await _collect_document_remote_paths_async(db=db, document=document)
        await _delete_remote_paths_for_owner(
            db=db,
            owner_user_id=document.creator_id,
            paths=paths,
            log_scope="document_remote_file",
            file_services=file_services,
        )


async def delete_section_remote_files(
    *,
    db: AsyncSession,
    sections: list[models.section.Section],
) -> None:
    """Physically delete every remote-storage object owned by ``sections``
    (markdown and podcast files), plus their inventory rows."""
    file_services: dict[int, object] = {}
    for section in sections:
        paths = await _collect_section_remote_paths_async(db=db, section=section)
        await _delete_remote_paths_for_owner(
            db=db,
            owner_user_id=section.creator_id,
            paths=paths,
            log_scope="section_remote_file",
            file_services=file_services,
        )
