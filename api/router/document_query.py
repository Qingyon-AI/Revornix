import json
from typing import Any, cast

from fastapi import APIRouter, Depends
from fastapi.responses import PlainTextResponse
from sqlalchemy.ext.asyncio import AsyncSession

import crud
import models
import schemas
from common.dependencies import get_async_db, get_current_user, get_current_user_without_throw
from common.file import get_remote_file_signed_urls
from data.milvus.search import (
    hybrid_search,
    naive_search,
    public_hybrid_search,
    public_naive_search,
)
from enums.document import DocumentCategory
from proxy.file_system_proxy import FileSystemProxy
from common.access_control import ensure_document_access, ensure_publish_access_key
from common.query_helpers import resolve_infinite_scroll_meta

document_query_router = APIRouter()


def _parse_speaker_map(raw: str | None) -> dict[str, str] | None:
    """Decode the stored speaker-map JSON into a label->name dict."""
    if not raw:
        return None
    try:
        parsed = json.loads(raw)
    except (ValueError, TypeError):
        return None
    if not isinstance(parsed, dict):
        return None
    return {str(key): str(value) for key, value in parsed.items()}


def _fuse_chunk_and_title_results(
    *,
    fused_chunks: list[dict[str, Any]],
    title_matches: list[Any],
    limit: int,
    rrf_k: int = 60,
) -> list[int]:
    """Combine chunk-level hybrid results with title keyword matches via RRF.

    Title matches are a strong precision signal — when a user's query appears
    verbatim in a document title, that document should outrank semantic-only
    hits. We treat the title-match list as a second retriever and fuse it with
    the chunk-fused list using Reciprocal Rank Fusion. Returns deduplicated,
    score-ordered doc_ids capped at `limit`.
    """
    scores: dict[int, float] = {}
    for rank, chunk in enumerate(fused_chunks):
        doc_id = chunk.get("doc_id")
        if doc_id is None:
            continue
        scores[doc_id] = scores.get(doc_id, 0.0) + 1.0 / (rrf_k + rank + 1)
    for rank, document in enumerate(title_matches):
        # Title matches get a slight boost to break ties in favor of titles —
        # a verbatim title hit is strictly more meaningful than a body chunk
        # match at the same RRF rank.
        scores[document.id] = scores.get(document.id, 0.0) + 1.2 / (rrf_k + rank + 1)
    ordered = sorted(scores.items(), key=lambda kv: kv[1], reverse=True)
    return [doc_id for doc_id, _ in ordered[:limit]]


async def _batch_sign_remote_fields(
    items: list[tuple[Any, str, int]],
) -> None:
    if not items:
        return
    valid_items = [
        (item, field_name, user_id)
        for item, field_name, user_id in items
        if item is not None and getattr(item, field_name) is not None
    ]
    if not valid_items:
        return
    signed_urls = await get_remote_file_signed_urls(
        [
            (user_id, getattr(item, field_name))
            for item, field_name, user_id in valid_items
        ]
    )
    for (item, field_name, _), signed_url in zip(valid_items, signed_urls, strict=False):
        setattr(item, field_name, signed_url)


async def _ensure_document_access(
    *,
    db: AsyncSession,
    document_id: int,
    document_creator_id: int,
    user_id: int | None,
    access_key: str | None = None,
) -> models.document.PublishDocument | None:
    db_published_document = await crud.document.get_publish_document_by_document_id_async(
        db=db,
        document_id=document_id,
    )
    if user_id is not None and document_creator_id == user_id:
        return db_published_document
    if db_published_document is not None:
        has_direct_access = False
        if user_id is not None:
            db_user_document = await crud.document.get_user_document_by_user_id_and_document_id_async(
                db=db,
                user_id=user_id,
                document_id=document_id,
            )
            has_direct_access = db_user_document is not None
        ensure_publish_access_key(
            access_key_encrypted=db_published_document.access_key_encrypted,
            provided_key=access_key,
            has_direct_access=has_direct_access,
        )
        return db_published_document

    if user_id is None:
        ensure_document_access(
            user_id=user_id,
            is_creator=False,
            has_public_document=False,
            has_document_collaborator=False,
        )
        return None

    db_user_document = await crud.document.get_user_document_by_user_id_and_document_id_async(
        db=db,
        user_id=user_id,
        document_id=document_id,
    )
    ensure_document_access(
        user_id=user_id,
        is_creator=False,
        has_public_document=False,
        has_document_collaborator=db_user_document is not None,
    )
    return None


async def get_document_infos(
    db: AsyncSession,
    documents: list[models.document.Document]
):
    if not documents:
        return []
    document_ids = [document.id for document in documents]
    creator_ids = list({document.creator_id for document in documents})

    task_bundle_rows = await crud.task.get_document_task_bundles_by_document_ids_async(
        db=db,
        document_ids=document_ids,
    )
    labels_by_document_id = await crud.document.get_labels_by_document_ids_async(db=db, document_ids=document_ids)
    db_users = await crud.user.get_users_by_ids_async(
        db=db,
        user_ids=creator_ids,
    )
    db_publish_documents = await crud.document.get_publish_documents_by_document_ids_async(
        db=db,
        document_ids=document_ids,
    )
    publish_uuid_by_document_id = {
        item.document_id: item.uuid for item in db_publish_documents
    }

    task_bundle_by_document_id = {
        document_id: (
            convert_task,
            podcast_task,
            summarize_task,
            embedding_task,
            graph_task,
            transcribe_task,
            process_task,
        )
        for (
            document_id,
            convert_task,
            podcast_task,
            summarize_task,
            embedding_task,
            graph_task,
            transcribe_task,
            process_task,
        ) in task_bundle_rows
    }
    user_by_id = {user.id: user for user in db_users}

    res = []
    remote_fields_to_sign: list[tuple[Any, str, int]] = []
    for document in documents:
        info = schemas.document.DocumentInfo.model_validate(document)
        info.publish_uuid = publish_uuid_by_document_id.get(document.id)
        db_user = user_by_id.get(document.creator_id)
        if db_user is not None:
            info.creator = schemas.user.UserPublicInfo.model_validate(db_user)
        info.labels = [
            schemas.document.DocumentLabel(id=label.id, name=label.name)
            for label in labels_by_document_id.get(document.id, [])
        ]

        (
            convert_task,
            podcast_task,
            summarize_task,
            embedding_task,
            graph_task,
            transcribe_task,
            process_task,
        ) = task_bundle_by_document_id.get(document.id, (None, None, None, None, None, None, None))

        if convert_task is not None:
            info.convert_task = schemas.task.DocumentConvertTask(
                status=convert_task.status,
                md_file_name=convert_task.md_file_name,
                create_time=convert_task.create_time,
                update_time=convert_task.update_time,
            )
            remote_fields_to_sign.append((info.convert_task, "md_file_name", document.creator_id))

        if embedding_task is not None:
            info.embedding_task = schemas.task.DocumentEmbeddingTask(
                status=embedding_task.status,
                create_time=embedding_task.create_time,
                update_time=embedding_task.update_time,
            )

        if graph_task is not None:
            info.graph_task = schemas.task.DocumentGraphTask(
                status=graph_task.status,
                create_time=graph_task.create_time,
                update_time=graph_task.update_time,
            )

        if podcast_task is not None:
            info.podcast_task = schemas.task.DocumentPodcastTask(
                status=podcast_task.status,
                podcast_file_name=podcast_task.podcast_file_name,
                podcast_script_file_name=podcast_task.podcast_script_file_name,
                create_time=podcast_task.create_time,
                update_time=podcast_task.update_time,
            )
            remote_fields_to_sign.append((info.podcast_task, "podcast_file_name", document.creator_id))
            remote_fields_to_sign.append((info.podcast_task, "podcast_script_file_name", document.creator_id))

        if summarize_task is not None:
            info.summarize_task = schemas.task.DocumentSummarizeTask(
                status=summarize_task.status,
                summary=summarize_task.summary,
                create_time=summarize_task.create_time,
                update_time=summarize_task.update_time,
            )

        if transcribe_task is not None:
            info.transcribe_task = schemas.task.DocumentTranscribeTask(
                status=transcribe_task.status,
                md_file_name=transcribe_task.md_file_name,
                segments_file_name=transcribe_task.segments_file_name,
                create_time=transcribe_task.create_time,
                update_time=transcribe_task.update_time,
            )
            if transcribe_task.md_file_name is not None:
                remote_fields_to_sign.append((info.transcribe_task, "md_file_name", document.creator_id))
            if transcribe_task.segments_file_name is not None:
                remote_fields_to_sign.append((info.transcribe_task, "segments_file_name", document.creator_id))

        if process_task is not None:
            info.process_task = schemas.task.DocumentProcessTask(
                status=process_task.status,
                create_time=process_task.create_time,
                update_time=process_task.update_time,
            )

        res.append(info)
    await _batch_sign_remote_fields(remote_fields_to_sign)
    return res


async def _resolve_document_from_detail_request(
    *,
    db: AsyncSession,
    document_detail_request: schemas.document.DocumentDetailRequest,
    user: models.user.User | None,
) -> models.document.Document:
    if document_detail_request.document_id is not None:
        document = await crud.document.get_document_by_document_id_async(
            db=db,
            document_id=document_detail_request.document_id,
        )
        if document is None:
            raise schemas.error.CustomException("Document not found", code=404)
        return document

    if document_detail_request.uuid is not None and document_detail_request.uuid.strip():
        # Public share links resolve through the publish uuid, mirroring
        # sections: unpublished/revoked documents are simply not found.
        db_publish_document = await crud.document.get_publish_document_by_uuid_async(
            db=db,
            uuid=document_detail_request.uuid.strip(),
        )
        if db_publish_document is None:
            raise schemas.error.CustomException("Document not found", code=404)
        document = await crud.document.get_document_by_document_id_async(
            db=db,
            document_id=db_publish_document.document_id,
        )
        if document is None:
            raise schemas.error.CustomException("Document not found", code=404)
        return document

    assert document_detail_request.url is not None
    normalized_url = document_detail_request.url.strip()
    if not normalized_url:
        raise schemas.error.CustomException("Either document_id, uuid or url is required", code=400)
    if user is None:
        raise schemas.error.CustomException(
            "Authentication is required when querying document detail by url",
            code=403,
        )

    document = await crud.document.get_website_document_by_user_id_and_url_async(
        db=db,
        user_id=user.id,
        url=normalized_url,
    )
    if document is None:
        raise schemas.error.CustomException("Document not found", code=404)
    return document


async def _resolve_document_markdown_file_path(
    *,
    db: AsyncSession,
    document: models.document.Document,
    snapshot_id: int | None,
) -> str:
    if snapshot_id is not None:
        if document.category != DocumentCategory.WEBSITE:
            raise schemas.error.CustomException("Snapshot is only supported for website documents", code=400)
        website_snapshots = await crud.document.get_website_document_snapshots_by_document_id_async(
            db=db,
            document_id=document.id,
        )
        snapshot = next(
            (item for item in website_snapshots if item.id == snapshot_id),
            None,
        )
        if snapshot is None:
            raise schemas.error.CustomException("Website snapshot not found", code=404)
        if snapshot.md_file_name is None:
            raise schemas.error.CustomException("Document markdown is not ready", code=404)
        return snapshot.md_file_name

    if document.category == DocumentCategory.QUICK_NOTE:
        quick_note_document = await crud.document.get_quick_note_document_by_document_id_async(
            db=db,
            document_id=document.id,
        )
        if quick_note_document is None or not quick_note_document.md_file_name:
            raise schemas.error.CustomException("Document markdown is not ready", code=404)
        return quick_note_document.md_file_name

    if document.category == DocumentCategory.AUDIO:
        transcribe_task = await crud.task.get_document_audio_transcribe_task_by_document_id_async(
            db=db,
            document_id=document.id,
        )
        if transcribe_task is None or transcribe_task.md_file_name is None:
            # Legacy audio rows without ``md_file_name`` haven't been
            # backfilled yet; surface a clear error so the operator runs
            # ``scripts/backfill_audio_transcribed_md.py``.
            raise schemas.error.CustomException("Document markdown is not ready", code=404)
        return transcribe_task.md_file_name

    task_bundle_row = await crud.task.get_document_task_bundle_by_document_id_async(
        db=db,
        document_id=document.id,
    )
    if task_bundle_row is None:
        raise schemas.error.CustomException("Document markdown is not ready", code=404)
    convert_task = task_bundle_row[0]
    if convert_task is None or convert_task.md_file_name is None:
        raise schemas.error.CustomException("Document markdown is not ready", code=404)
    return convert_task.md_file_name

@document_query_router.post('/detail', response_model=schemas.document.DocumentDetailResponse)
async def get_document_detail(
    document_detail_request: schemas.document.DocumentDetailRequest,
    db: AsyncSession = Depends(get_async_db),
    user: models.user.User | None = Depends(get_current_user_without_throw)
):
    document = await _resolve_document_from_detail_request(
        db=db,
        document_detail_request=document_detail_request,
        user=user,
    )
    document_id = document.id

    db_publish_document = await _ensure_document_access(
        db=db,
        document_id=document_id,
        document_creator_id=document.creator_id,
        user_id=user.id if user is not None else None,
        access_key=document_detail_request.access_key,
    )

    is_star = None
    is_read = None
    if user is not None:
        is_star = await crud.document.get_star_document_by_user_id_and_document_id_async(
            db=db,
            user_id=user.id,
            document_id=document_id,
        ) is not None
        is_read = await crud.document.get_read_document_by_document_id_and_user_id_async(
            db=db,
            user_id=user.id,
            document_id=document_id,
        ) is not None
    db_sections = await crud.document.get_sections_by_document_id_async(
        db=db,
        document_id=document_id,
    )
    publish_sections = await crud.section.get_publish_sections_by_section_ids_async(
        db=db,
        section_ids=[section.id for section in db_sections],
    )
    publish_uuid_by_section_id = {
        item.section_id: item.uuid for item in publish_sections
    }
    public_section_ids = set(publish_uuid_by_section_id.keys())
    visible_section_ids = set(public_section_ids)
    if user is not None and document.creator_id == user.id:
        visible_section_ids = {section.id for section in db_sections}
    elif user is not None:
        visible_sections = await crud.document.get_published_section_of_the_document_by_document_id_async(
            db=db,
            document_id=document_id,
            user_id=user.id,
        )
        visible_section_ids.update(section.id for section in visible_sections)

    sections = [
        schemas.document.BaseSectionInfo(
            id=section.id,
            title=section.title,
            description=section.description,
            publish_uuid=publish_uuid_by_section_id.get(section.id),
        )
        for section in db_sections
        if section.id in visible_section_ids
    ]
    collaborator_rows = await crud.document.search_users_and_document_users_by_document_id_async(
        db=db,
        document_id=document_id,
        limit=100,
    )
    collaborators = []
    for db_user, db_user_document in collaborator_rows:
        collaborator = schemas.user.UserPublicInfo.model_validate(db_user)
        collaborators.append(collaborator)
    await _batch_sign_remote_fields([
        (collaborator, "avatar", collaborator.id)
        for collaborator in collaborators
    ])
    db_labels = await crud.document.get_labels_by_document_id_async(
        db=db,
        document_id=document_id,
    )
    labels = [
        schemas.document.DocumentLabel(
            id=label.id,
            name=label.name
        ) for label in db_labels
    ]
    res = schemas.document.DocumentDetailResponse(
        id=document.id,
        publish_uuid=db_publish_document.uuid if db_publish_document is not None else None,
        has_access_key=db_publish_document.access_key_encrypted is not None if db_publish_document is not None else False,
        labels=labels,
        sections=sections,
        users=collaborators,
        title=document.title,
        category=document.category,
        description=document.description,
        creator=document.creator,
        cover=document.cover,
        from_plat=document.from_plat,
        create_time=document.create_time,
        update_time=document.update_time,
        is_star=is_star,
        is_read=is_read
    )
    subtype_bundle = None
    if document.category in {
        DocumentCategory.WEBSITE,
        DocumentCategory.FILE,
        DocumentCategory.QUICK_NOTE,
        DocumentCategory.AUDIO,
    }:
        subtype_bundle = await crud.document.get_document_subtype_bundle_by_document_id_async(
            db=db,
            document_id=document_id,
        )
    if document.category == DocumentCategory.WEBSITE:
        website_document = subtype_bundle[0] if subtype_bundle is not None else None
        website_snapshots = await crud.document.get_website_document_snapshots_by_document_id_async(
            db=db,
            document_id=document_id,
        )
        if website_document is not None:
            res.website_info = schemas.document.WebsiteDocumentInfo(
                url=website_document.url,
                latest_snapshot_time=website_snapshots[0].create_time if website_snapshots else None,
                snapshot_count=len(website_snapshots),
            )
        await _batch_sign_remote_fields([
            (snapshot, "md_file_name", document.creator_id)
            for snapshot in website_snapshots
        ])
        res.website_snapshots = [
            schemas.document.WebsiteDocumentSnapshotInfo.model_validate(snapshot)
            for snapshot in website_snapshots
        ]
    elif document.category == DocumentCategory.FILE:
        file_document = subtype_bundle[1] if subtype_bundle is not None else None
        if file_document is not None:
            res.file_info = schemas.document.FileDocumentInfo(
                file_name=file_document.file_name
            )
    elif document.category == DocumentCategory.QUICK_NOTE:
        quick_note_document = subtype_bundle[2] if subtype_bundle is not None else None
        if quick_note_document is not None:
            res.quick_note_info = schemas.document.QuickNoteDocumentInfo(
                md_file_name=quick_note_document.md_file_name
            )
    elif document.category == DocumentCategory.AUDIO:
        audio_document = subtype_bundle[3] if subtype_bundle is not None else None
        if audio_document is not None:
            res.audio_info = schemas.document.AudioDocumentInfo(
                audio_file_name=audio_document.audio_file_name,
                meeting_mode=bool(audio_document.meeting_mode),
                speaker_map=_parse_speaker_map(audio_document.speaker_map),
            )
    task_bundle_row = await crud.task.get_document_task_bundle_by_document_id_async(
        db=db,
        document_id=document_id,
    )
    convert_task = None
    podcast_task = None
    summarize_task = None
    embedding_task = None
    graph_task = None
    transcribe_task = None
    process_task = None
    if task_bundle_row is not None:
        (
            convert_task,
            podcast_task,
            summarize_task,
            embedding_task,
            graph_task,
            transcribe_task,
            process_task,
        ) = task_bundle_row
    if convert_task is not None:
        res.convert_task = schemas.document.DocumentConvertTask(
            status=convert_task.status,
            md_file_name=convert_task.md_file_name,
            create_time=convert_task.create_time,
            update_time=convert_task.update_time,
        )
    if podcast_task is not None:
        res.podcast_task = schemas.document.DocumentPodcastTask(
            status=podcast_task.status,
            podcast_file_name=podcast_task.podcast_file_name,
            podcast_script_file_name=podcast_task.podcast_script_file_name,
            create_time=podcast_task.create_time,
            update_time=podcast_task.update_time,
        )
    if summarize_task is not None:
        res.summarize_task = schemas.document.DocumentSummarizeTask(
            status=summarize_task.status,
            summary=summarize_task.summary,
            create_time=summarize_task.create_time,
            update_time=summarize_task.update_time,
        )
    res.embedding_task = embedding_task
    res.graph_task = graph_task
    if transcribe_task is not None:
        res.transcribe_task = schemas.task.DocumentTranscribeTask(
            status=transcribe_task.status,
            md_file_name=transcribe_task.md_file_name,
            segments_file_name=transcribe_task.segments_file_name,
            create_time=transcribe_task.create_time,
            update_time=transcribe_task.update_time,
        )
    res.process_task = process_task
    await _batch_sign_remote_fields([
        (res.file_info, "file_name", document.creator_id),
        (res.audio_info, "audio_file_name", document.creator_id),
        (res.convert_task, "md_file_name", document.creator_id),
        (res.transcribe_task, "md_file_name", document.creator_id),
        (res.transcribe_task, "segments_file_name", document.creator_id),
        (res.podcast_task, "podcast_file_name", document.creator_id),
        (res.podcast_task, "podcast_script_file_name", document.creator_id),
    ])
    return res


@document_query_router.post('/markdown/content', response_class=PlainTextResponse)
async def get_document_markdown_content(
    document_markdown_request: schemas.document.DocumentMarkdownContentRequest,
    db: AsyncSession = Depends(get_async_db),
    user: models.user.User | None = Depends(get_current_user_without_throw)
):
    document = await _resolve_document_from_detail_request(
        db=db,
        document_detail_request=schemas.document.DocumentDetailRequest(
            document_id=document_markdown_request.document_id,
            url=document_markdown_request.url,
        ),
        user=user,
    )
    await _ensure_document_access(
        db=db,
        document_id=document.id,
        document_creator_id=document.creator_id,
        user_id=user.id if user is not None else None,
        access_key=document_markdown_request.access_key,
    )
    markdown_file_path = await _resolve_document_markdown_file_path(
        db=db,
        document=document,
        snapshot_id=document_markdown_request.snapshot_id,
    )
    remote_file_service = await FileSystemProxy.create(user_id=document.creator_id)
    raw_content = await remote_file_service.get_file_content_by_file_path(
        file_path=markdown_file_path
    )
    if isinstance(raw_content, bytes):
        return PlainTextResponse(content=raw_content.decode("utf-8"))
    return PlainTextResponse(content=raw_content)

@document_query_router.post('/unread/search', response_model=schemas.pagination.InfiniteScrollPagination[schemas.document.DocumentInfo])
async def search_user_unread_documents(
    search_unread_list_request: schemas.document.SearchUnreadListRequest,
    db: AsyncSession = Depends(get_async_db),
    user: models.user.User = Depends(get_current_user)
):
    has_more = False
    next_start = None
    db_documents = await crud.document.search_user_unread_documents_async(
        db=db,
        user_id=user.id,
        start=search_unread_list_request.start,
        limit=search_unread_list_request.limit,
        keyword=search_unread_list_request.keyword,
        label_ids=search_unread_list_request.label_ids,
        desc=search_unread_list_request.desc
    )

    documents = await get_document_infos(db=db, documents=db_documents)
    next_document = None
    if search_unread_list_request.limit > 0 and len(documents) == search_unread_list_request.limit:
        next_document = await crud.document.search_next_user_unread_document_async(
            db=db,
            user_id=user.id,
            document=db_documents[-1],
            keyword=search_unread_list_request.keyword,
            label_ids=search_unread_list_request.label_ids,
            desc=search_unread_list_request.desc
        )
    has_more, next_start = resolve_infinite_scroll_meta(
        page_item_count=len(documents),
        limit=search_unread_list_request.limit,
        next_item_id=next_document.id if next_document is not None else None,
    )
    total = await crud.document.count_user_unread_documents_async(
        db=db,
        user_id=user.id,
        keyword=search_unread_list_request.keyword,
        label_ids=search_unread_list_request.label_ids
    )
    return schemas.pagination.InfiniteScrollPagination(
        total=total,
        elements=documents,
        start=search_unread_list_request.start,
        limit=search_unread_list_request.limit,
        has_more=has_more,
        next_start=next_start
    )

@document_query_router.post('/recent/search', response_model=schemas.pagination.InfiniteScrollPagination[schemas.document.DocumentInfo])
async def recent_read_document(
    search_recent_read_request: schemas.document.SearchRecentReadRequest,
    db: AsyncSession = Depends(get_async_db),
    user: models.user.User = Depends(get_current_user)
):
    has_more = False
    next_start = None
    db_documents = await crud.document.search_user_recent_read_documents_async(
        db=db,
        user_id=user.id,
        start=search_recent_read_request.start,
        limit=search_recent_read_request.limit,
        keyword=search_recent_read_request.keyword,
        label_ids=search_recent_read_request.label_ids,
        desc=search_recent_read_request.desc
    )
    documents = await get_document_infos(db=db, documents=db_documents)
    next_document = None
    if search_recent_read_request.limit > 0 and len(documents) == search_recent_read_request.limit:
        next_document = await crud.document.search_next_user_recent_read_document_async(
            db=db,
            user_id=user.id,
            document=db_documents[-1],
            keyword=search_recent_read_request.keyword,
            label_ids=search_recent_read_request.label_ids,
            desc=search_recent_read_request.desc
        )
    has_more, next_start = resolve_infinite_scroll_meta(
        page_item_count=len(documents),
        limit=search_recent_read_request.limit,
        next_item_id=next_document.id if next_document is not None else None,
    )
    total = await crud.document.count_user_recent_read_documents_async(
        db=db,
        user_id=user.id,
        keyword=search_recent_read_request.keyword,
        label_ids=search_recent_read_request.label_ids
    )
    return schemas.pagination.InfiniteScrollPagination(
        total=total,
        elements=documents,
        start=search_recent_read_request.start,
        limit=search_recent_read_request.limit,
        has_more=has_more,
        next_start=next_start
    )

@document_query_router.post('/search/mine', response_model=schemas.pagination.InfiniteScrollPagination[schemas.document.DocumentInfo])
async def search_all_mine_documents(
    search_all_my_document_request: schemas.document.SearchAllMyDocumentsRequest,
    db: AsyncSession = Depends(get_async_db),
    user: models.user.User = Depends(get_current_user)
):
    has_more = False
    next_start = None
    db_documents = await crud.document.search_user_documents_async(
        db=db,
        user_id=user.id,
        start=search_all_my_document_request.start,
        limit=search_all_my_document_request.limit,
        keyword=search_all_my_document_request.keyword,
        label_ids=search_all_my_document_request.label_ids,
        desc=search_all_my_document_request.desc
    )
    documents = await get_document_infos(db=db, documents=db_documents)
    next_document = None
    if search_all_my_document_request.limit > 0 and len(documents) == search_all_my_document_request.limit:
        next_document = await crud.document.search_next_user_document_async(
            db=db,
            user_id=user.id,
            document=db_documents[-1],
            keyword=search_all_my_document_request.keyword,
            label_ids=search_all_my_document_request.label_ids,
            desc=search_all_my_document_request.desc
        )
    has_more, next_start = resolve_infinite_scroll_meta(
        page_item_count=len(documents),
        limit=search_all_my_document_request.limit,
        next_item_id=next_document.id if next_document is not None else None,
    )
    total = await crud.document.count_user_documents_async(
        db=db,
        user_id=user.id,
        keyword=search_all_my_document_request.keyword,
        label_ids=search_all_my_document_request.label_ids
    )
    return schemas.pagination.InfiniteScrollPagination(
        total=total,
        elements=documents,
        start=search_all_my_document_request.start,
        limit=search_all_my_document_request.limit,
        has_more=has_more,
        next_start=next_start
    )

@document_query_router.post('/star/search', response_model=schemas.pagination.InfiniteScrollPagination[schemas.document.DocumentInfo])
async def search_my_star_documents(
    search_my_star_documents_request: schemas.document.SearchMyStarDocumentsRequest,
    db: AsyncSession = Depends(get_async_db),
    user: models.user.User = Depends(get_current_user)
):
    has_more = False
    next_start = None
    db_documents = await crud.document.search_user_stared_documents_async(
        db=db,
        user_id=user.id,
        start=search_my_star_documents_request.start,
        limit=search_my_star_documents_request.limit,
        keyword=search_my_star_documents_request.keyword,
        label_ids=search_my_star_documents_request.label_ids,
        desc=search_my_star_documents_request.desc
    )
    documents = await get_document_infos(db=db, documents=db_documents)
    next_document = None
    if search_my_star_documents_request.limit > 0 and len(documents) == search_my_star_documents_request.limit:
        next_document = await crud.document.search_next_user_star_document_async(
            db=db,
            user_id=user.id,
            document=db_documents[-1],
            keyword=search_my_star_documents_request.keyword,
            label_ids=search_my_star_documents_request.label_ids,
            desc=search_my_star_documents_request.desc
        )
    has_more, next_start = resolve_infinite_scroll_meta(
        page_item_count=len(documents),
        limit=search_my_star_documents_request.limit,
        next_item_id=next_document.id if next_document is not None else None,
    )
    total = await crud.document.count_user_stared_documents_async(
        db=db,
        user_id=user.id,
        keyword=search_my_star_documents_request.keyword,
        label_ids=search_my_star_documents_request.label_ids
    )
    return schemas.pagination.InfiniteScrollPagination(
        total=total,
        elements=documents,
        start=search_my_star_documents_request.start,
        limit=search_my_star_documents_request.limit,
        has_more=has_more,
        next_start=next_start
    )

@document_query_router.post('/public/search', response_model=schemas.pagination.InfiniteScrollPagination[schemas.document.DocumentInfo])
async def search_public_documents(
    search_public_documents_request: schemas.document.SearchPublicDocumentsRequest,
    db: AsyncSession = Depends(get_async_db),
    user: models.user.User | None = Depends(get_current_user_without_throw),
):
    # 仅在用户查看自己的文档时返回所有文档，否则仅返回公开文档
    only_published = (
        user is None
        or search_public_documents_request.creator_id is None
        or search_public_documents_request.creator_id != user.id
    )
    db_documents = await crud.document.search_published_documents_async(
        db=db,
        start=search_public_documents_request.start,
        limit=search_public_documents_request.limit,
        keyword=search_public_documents_request.keyword,
        creator_id=search_public_documents_request.creator_id,
        label_ids=search_public_documents_request.label_ids,
        desc=search_public_documents_request.desc,
        only_published=only_published,
    )
    documents = await get_document_infos(db=db, documents=db_documents)

    next_document = None
    if (
        search_public_documents_request.limit > 0
        and len(db_documents) == search_public_documents_request.limit
    ):
        next_document = await crud.document.search_next_published_document_async(
            db=db,
            document=db_documents[-1],
            keyword=search_public_documents_request.keyword,
            creator_id=search_public_documents_request.creator_id,
            label_ids=search_public_documents_request.label_ids,
            desc=search_public_documents_request.desc,
            only_published=only_published,
        )
    has_more, next_start = resolve_infinite_scroll_meta(
        page_item_count=len(documents),
        limit=search_public_documents_request.limit,
        next_item_id=next_document.id if next_document is not None else None,
    )
    total = await crud.document.count_published_documents_async(
        db=db,
        keyword=search_public_documents_request.keyword,
        creator_id=search_public_documents_request.creator_id,
        label_ids=search_public_documents_request.label_ids,
        only_published=only_published,
    )
    return schemas.pagination.InfiniteScrollPagination(
        total=total,
        elements=documents,
        start=search_public_documents_request.start,
        limit=search_public_documents_request.limit,
        has_more=has_more,
        next_start=next_start,
    )


@document_query_router.post('/vector/search', response_model=schemas.document.VectorSearchResponse)
async def search_knowledge_vector(
    vector_search_request: schemas.document.VectorSearchRequest,
    db: AsyncSession = Depends(get_async_db),
    user: models.user.User = Depends(get_current_user)
):
    query = vector_search_request.query.strip()
    if not query:
        return schemas.document.VectorSearchResponse(documents=[])

    if vector_search_request.mode == "text":
        db_documents = await crud.document.search_user_documents_async(
            db=db,
            user_id=user.id,
            keyword=query,
            limit=vector_search_request.limit,
        )
        documents = [
            schemas.document.DocumentInfo.model_validate(document)
            for document in db_documents
        ]
        return schemas.document.VectorSearchResponse(documents=documents)

    fused_chunks = await hybrid_search(
        user_id=user.id,
        search_text=query,
        top_k=vector_search_request.limit * 2,
    )
    title_matches = await crud.document.search_user_documents_async(
        db=db,
        user_id=user.id,
        keyword=query,
        limit=vector_search_request.limit,
    )
    snippets_pool: dict[int, str] = {
        cast(int, chunk['doc_id']): cast(str, chunk.get('text') or '')
        for chunk in fused_chunks
        if chunk.get('doc_id') is not None
    }
    document_ids = _fuse_chunk_and_title_results(
        fused_chunks=fused_chunks,
        title_matches=title_matches,
        limit=vector_search_request.limit,
    )
    snippets = {doc_id: snippets_pool[doc_id] for doc_id in document_ids if doc_id in snippets_pool}
    db_documents = await crud.document.get_documents_by_document_ids_async(
        db=db,
        document_ids=document_ids
    )
    document_by_id = {document.id: document for document in db_documents}
    documents = [
        schemas.document.DocumentInfo.model_validate(document_by_id[document_id])
        for document_id in document_ids
        if document_id in document_by_id
    ]
    return schemas.document.VectorSearchResponse(documents=documents, snippets=snippets)


@document_query_router.post('/public/vector/search', response_model=schemas.document.VectorSearchResponse)
async def search_public_knowledge_vector(
    vector_search_request: schemas.document.VectorSearchRequest,
    db: AsyncSession = Depends(get_async_db),
):
    query = vector_search_request.query.strip()
    if not query:
        return schemas.document.VectorSearchResponse(documents=[])

    if vector_search_request.mode == "text":
        db_documents = await crud.document.search_published_documents_async(
            db=db,
            keyword=query,
            limit=vector_search_request.limit,
        )
        documents = [
            schemas.document.DocumentInfo.model_validate(document)
            for document in db_documents
        ]
        return schemas.document.VectorSearchResponse(documents=documents)

    # Vector mode: pull a wider candidate set from milvus, then keep only
    # documents that are currently published. Without the post-filter, the
    # public endpoint would leak private documents.
    candidate_top_k = max(vector_search_request.limit * 4, 20)
    fused_chunks = await public_hybrid_search(
        search_text=query,
        top_k=candidate_top_k,
    )
    title_matches = await crud.document.search_published_documents_async(
        db=db,
        keyword=query,
        limit=vector_search_request.limit,
    )
    candidate_document_ids: list[int] = [
        cast(int, chunk.get('doc_id')) for chunk in fused_chunks
    ]
    candidate_document_ids.extend(doc.id for doc in title_matches)
    if not candidate_document_ids:
        return schemas.document.VectorSearchResponse(documents=[])

    publish_records = await crud.document.get_publish_documents_by_document_ids_async(
        db=db,
        document_ids=candidate_document_ids,
    )
    published_ids = {record.document_id for record in publish_records}
    # Drop title matches that aren't actually published (the title-match query
    # already filters by published, but keep this defensive in case schemas
    # diverge).
    title_matches = [doc for doc in title_matches if doc.id in published_ids]
    fused_chunks = [chunk for chunk in fused_chunks if chunk.get('doc_id') in published_ids]
    snippet_by_id: dict[int, str] = {
        cast(int, chunk['doc_id']): cast(str, chunk.get('text') or '')
        for chunk in fused_chunks
        if chunk.get('doc_id') in published_ids
    }
    ordered_ids = _fuse_chunk_and_title_results(
        fused_chunks=fused_chunks,
        title_matches=title_matches,
        limit=vector_search_request.limit,
    )
    snippets = {doc_id: snippet_by_id[doc_id] for doc_id in ordered_ids if doc_id in snippet_by_id}
    db_documents = await crud.document.get_documents_by_document_ids_async(
        db=db,
        document_ids=ordered_ids,
    )
    document_by_id = {document.id: document for document in db_documents}
    documents = [
        schemas.document.DocumentInfo.model_validate(document_by_id[document_id])
        for document_id in ordered_ids
        if document_id in document_by_id
    ]
    return schemas.document.VectorSearchResponse(documents=documents, snippets=snippets)
