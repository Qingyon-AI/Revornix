from typing import Any, cast

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

import crud
import models
import schemas
from common.dependencies import get_async_db, get_current_user, get_current_user_without_throw
from common.file import get_remote_file_signed_urls
from data.milvus.search import naive_search
from enums.document import DocumentCategory
from router.logic_helpers import ensure_document_access, resolve_infinite_scroll_meta

document_query_router = APIRouter()


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
) -> None:
    db_published_document = await crud.document.get_publish_document_by_document_id_async(
        db=db,
        document_id=document_id,
    )
    if user_id is not None and document_creator_id == user_id:
        return
    if db_published_document is not None:
        return

    if user_id is None:
        ensure_document_access(
            is_creator=False,
            has_public_document=False,
            has_document_collaborator=False,
        )
        return

    db_user_document = await crud.document.get_user_document_by_user_id_and_document_id_async(
        db=db,
        user_id=user_id,
        document_id=document_id,
    )
    ensure_document_access(
        is_creator=False,
        has_public_document=False,
        has_document_collaborator=db_user_document is not None,
    )


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
                transcribed_text=transcribe_task.transcribed_text,
                create_time=transcribe_task.create_time,
                update_time=transcribe_task.update_time,
            )

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

    assert document_detail_request.url is not None
    normalized_url = document_detail_request.url.strip()
    if not normalized_url:
        raise schemas.error.CustomException("Either document_id or url is required", code=400)
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

    await _ensure_document_access(
        db=db,
        document_id=document_id,
        document_creator_id=document.creator_id,
        user_id=user.id if user is not None else None,
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
                content=quick_note_document.content
            )
    elif document.category == DocumentCategory.AUDIO:
        audio_document = subtype_bundle[3] if subtype_bundle is not None else None
        if audio_document is not None:
            res.audio_info = schemas.document.AudioDocumentInfo(
                audio_file_name=audio_document.audio_file_name
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
    res.transcribe_task = transcribe_task
    res.process_task = process_task
    await _batch_sign_remote_fields([
        (res.file_info, "file_name", document.creator_id),
        (res.audio_info, "audio_file_name", document.creator_id),
        (res.convert_task, "md_file_name", document.creator_id),
        (res.podcast_task, "podcast_file_name", document.creator_id),
        (res.podcast_task, "podcast_script_file_name", document.creator_id),
    ])
    return res

@document_query_router.post('/unread/search', response_model=schemas.pagination.InifiniteScrollPagnition[schemas.document.DocumentInfo])
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
    return schemas.pagination.InifiniteScrollPagnition(
        total=total,
        elements=documents,
        start=search_unread_list_request.start,
        limit=search_unread_list_request.limit,
        has_more=has_more,
        next_start=next_start
    )

@document_query_router.post('/recent/search', response_model=schemas.pagination.InifiniteScrollPagnition[schemas.document.DocumentInfo])
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
    return schemas.pagination.InifiniteScrollPagnition(
        total=total,
        elements=documents,
        start=search_recent_read_request.start,
        limit=search_recent_read_request.limit,
        has_more=has_more,
        next_start=next_start
    )

@document_query_router.post('/search/mine', response_model=schemas.pagination.InifiniteScrollPagnition[schemas.document.DocumentInfo])
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
    return schemas.pagination.InifiniteScrollPagnition(
        total=total,
        elements=documents,
        start=search_all_my_document_request.start,
        limit=search_all_my_document_request.limit,
        has_more=has_more,
        next_start=next_start
    )

@document_query_router.post('/star/search', response_model=schemas.pagination.InifiniteScrollPagnition[schemas.document.DocumentInfo])
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
    return schemas.pagination.InifiniteScrollPagnition(
        total=total,
        elements=documents,
        start=search_my_star_documents_request.start,
        limit=search_my_star_documents_request.limit,
        has_more=has_more,
        next_start=next_start
    )

@document_query_router.post('/public/search', response_model=schemas.pagination.InifiniteScrollPagnition[schemas.document.DocumentInfo])
async def search_public_documents(
    search_public_documents_request: schemas.document.SearchPublicDocumentsRequest,
    db: AsyncSession = Depends(get_async_db),
):
    db_documents = await crud.document.search_published_documents_async(
        db=db,
        start=search_public_documents_request.start,
        limit=search_public_documents_request.limit,
        keyword=search_public_documents_request.keyword,
        creator_id=search_public_documents_request.creator_id,
        label_ids=search_public_documents_request.label_ids,
        desc=search_public_documents_request.desc,
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
    )
    return schemas.pagination.InifiniteScrollPagnition(
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
    hybrid_results = await naive_search(
        user_id=user.id,
        search_text=vector_search_request.query
    )
    document_ids: list[int] = list(
        dict.fromkeys(cast(int, doc.get('doc_id')) for doc in hybrid_results)
    )
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
    return schemas.document.VectorSearchResponse(documents=documents)
