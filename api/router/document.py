from datetime import datetime, timezone

from celery import group
from fastapi import APIRouter, Depends, Header
from sqlalchemy.ext.asyncio import AsyncSession

import crud
import models
import schemas
from common.celery.app import (
    revoke_task,
    start_process_document,
    start_process_document_embedding,
    start_process_document_graph,
    start_process_document_podcast,
    start_process_document_summarize,
    start_process_document_transcribe,
    start_process_section,
)
from common.document_creation import create_document_for_user
from common.dependencies import (
    check_deployed_by_official,
    get_authorization_header,
    get_async_db,
    get_current_user,
    plan_ability_checked_in_func,
)
from common.resource_plan_access import ensure_engine_access, ensure_model_access
from common.timezone import (
    get_cached_user_timezone,
    normalize_timezone_name,
)
from enums.ability import Ability
from enums.document import (
    DocumentAudioTranscribeStatus,
    DocumentCategory,
    DocumentEmbeddingStatus,
    DocumentGraphStatus,
    DocumentMdConvertStatus,
    DocumentPodcastStatus,
    DocumentSummarizeStatus,
    UserDocumentAuthority,
)
from enums.section import SectionDocumentIntegration, SectionProcessTriggerType
from router.document_interaction_manage import document_interaction_manage_router
from router.document_ai import document_ai_router
from router.document_publish_manage import document_publish_manage_router
from router.document_user_manage import document_user_manage_router
from router.document_user_query import document_user_query_router
from router.document_query import document_query_router
from router.document_comment_manage import document_comment_manage_router
from router.document_note_public_query import document_note_public_query_router
from router.logic_helpers import ensure_document_manage_access, ensure_document_write_access

document_router = APIRouter()
document_router.include_router(document_query_router)
document_router.include_router(document_interaction_manage_router)
document_router.include_router(document_ai_router)
document_router.include_router(document_publish_manage_router)
document_router.include_router(document_user_manage_router)
document_router.include_router(document_user_query_router)
document_router.include_router(document_comment_manage_router)
document_router.include_router(document_note_public_query_router)


async def _get_document_collaborator(
    *,
    db: AsyncSession,
    document_id: int,
    user_id: int,
) -> models.document.UserDocument | None:
    return await crud.document.get_user_document_by_user_id_and_document_id_async(
        db=db,
        user_id=user_id,
        document_id=document_id,
    )


def _has_document_write_access(authority: int | None) -> bool:
    return authority in [
        UserDocumentAuthority.OWNER,
        UserDocumentAuthority.FULL_ACCESS,
        UserDocumentAuthority.READ_AND_WRITE,
    ]


@document_router.post('/label/summary', response_model=schemas.document.LabelSummaryResponse)
async def get_label_summary(
    db: AsyncSession = Depends(get_async_db),
    user: models.user.User = Depends(get_current_user)
):
    res = []
    db_labels_summary = await crud.document.get_labels_summary_async(
        db=db,
        user_id=user.id
    )
    for label, count in db_labels_summary:
        res.append(
            schemas.document.LabelSummaryItem(
                label_info=schemas.document.DocumentLabel(
                    id=label.id,
                    name=label.name
                ),
                count=count)
        )
    return schemas.document.LabelSummaryResponse(data=res)

@document_router.post('/label/delete', response_model=schemas.common.NormalResponse)
async def delete_label(
    label_delete_request: schemas.document.LabelDeleteRequest,
    db: AsyncSession = Depends(get_async_db),
    user: models.user.User = Depends(get_current_user)
):
    await crud.document.delete_document_labels_by_label_ids_async(
        db=db,
        label_ids=label_delete_request.label_ids,
    )
    await crud.document.delete_labels_by_label_ids_async(
        db=db,
        label_ids=label_delete_request.label_ids,
        user_id=user.id
    )
    await db.commit()
    return schemas.common.SuccessResponse()

@document_router.post("/label/list", response_model=schemas.document.LabelListResponse)
async def list_label(
    db: AsyncSession = Depends(get_async_db),
    user: models.user.User = Depends(get_current_user)
):
    db_labels = await crud.document.get_user_labels_by_user_id_async(
        db=db,
        user_id=user.id
    )
    labels = [
        schemas.document.DocumentLabel(id=label.id, name=label.name) for label in db_labels
    ]
    return schemas.document.LabelListResponse(data=labels)

@document_router.post('/label/create', response_model=schemas.document.CreateLabelResponse)
async def add_label(
    label_add_request: schemas.document.LabelAddRequest,
    db: AsyncSession = Depends(get_async_db),
    user: models.user.User = Depends(get_current_user)
):
    db_label = await crud.document.create_document_label_async(
        db=db,
        name=label_add_request.name,
        user_id=user.id
    )
    await db.commit()
    return schemas.document.CreateLabelResponse(id=db_label.id, name=db_label.name)

@document_router.post('/note/create', response_model=schemas.common.NormalResponse)
async def create_note(
    note_create_request: schemas.document.DocumentNoteCreateRequest,
    user: models.user.User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_db)
):
    await crud.document.create_document_note_async(
        db=db,
        user_id=user.id,
        document_id=note_create_request.document_id,
        content=note_create_request.content
    )
    await db.commit()
    return schemas.common.SuccessResponse()

@document_router.post('/note/delete', response_model=schemas.common.NormalResponse)
async def delete_note(
    note_delete_request: schemas.document.DocumentNoteDeleteRequest,
    user: models.user.User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_db)
):
    await crud.document.delete_document_notes_by_user_id_and_note_ids_async(
        db=db,
        user_id=user.id,
        note_ids=note_delete_request.document_note_ids
    )
    await db.commit()
    return schemas.common.SuccessResponse()

@document_router.post('/note/search', response_model=schemas.pagination.InifiniteScrollPagnition[schemas.document.DocumentNoteInfo])
async def search_note(
    search_note_request: schemas.document.SearchDocumentNoteRequest,
    user: models.user.User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_db)
):
    has_more = True
    next_start = None
    next_note = None
    notes = await crud.document.search_all_document_notes_by_document_id_async(
        db=db,
        document_id=search_note_request.document_id,
        start=search_note_request.start,
        limit=search_note_request.limit,
        keyword=search_note_request.keyword
    )
    if len(notes) < search_note_request.limit or len(notes) == 0:
        has_more = False
    if len(notes) == search_note_request.limit:
        next_note = await crud.document.search_next_note_by_document_note_async(
            db=db,
            document_note=notes[-1],
            keyword=search_note_request.keyword
        )
        has_more = next_note is not None
        next_start = next_note.id if next_note is not None else None
    total = await crud.document.count_all_document_notes_by_document_id_async(
        db=db,
        document_id=search_note_request.document_id,
        keyword=search_note_request.keyword
    )
    next_start = next_note.id if next_note is not None else None
    return schemas.pagination.InifiniteScrollPagnition(
        total=total,
        elements=notes,
        start=search_note_request.start,
        limit=search_note_request.limit,
        has_more=has_more,
        next_start=next_start
    )

@document_router.post('/ai/summary', response_model=schemas.common.NormalResponse)
async def create_ai_summary(
    ai_summary_request: schemas.document.DocumentAiSummaryRequest,
    user: models.user.User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_db)
):
    db_document = await crud.document.get_document_by_document_id_async(
        db=db,
        document_id=ai_summary_request.document_id
    )
    if db_document is None:
        raise schemas.error.CustomException("Document not found", code=404)
    collaborator = await _get_document_collaborator(
        db=db,
        document_id=db_document.id,
        user_id=user.id,
    )
    ensure_document_write_access(
        is_creator=db_document.creator_id == user.id,
        has_document_write_access=_has_document_write_access(
            collaborator.authority if collaborator is not None else None
        ),
    )
    selected_model_id = ai_summary_request.model_id or user.default_document_reader_model_id
    if selected_model_id is None:
        raise schemas.error.CustomException(
            "Default document reader model is not configured",
            code=400,
        )
    await ensure_model_access(
        db=db,
        user=user,
        model_id=selected_model_id,
    )

    db_exist_summarize_task = await crud.task.get_document_summarize_task_by_document_id_async(
        db=db,
        document_id=ai_summary_request.document_id
    )
    if db_exist_summarize_task is not None:
        if db_exist_summarize_task.status == DocumentSummarizeStatus.WAIT_TO:
            raise schemas.error.CustomException("Summary task is already queued", code=409)
        if db_exist_summarize_task.status == DocumentSummarizeStatus.SUMMARIZING:
            raise schemas.error.CustomException("Summary task is already in progress", code=409)
        db_exist_summarize_task.status = DocumentSummarizeStatus.WAIT_TO
        db_exist_summarize_task.summary = None
        db_exist_summarize_task.celery_task_id = None
        db_exist_summarize_task.update_time = datetime.now(timezone.utc)
    else:
        db_exist_summarize_task = await crud.task.create_document_summarize_task_async(
            db=db,
            user_id=user.id,
            document_id=ai_summary_request.document_id,
            status=DocumentSummarizeStatus.WAIT_TO,
        )

    db_process_task = await crud.task.get_document_process_task_by_document_id_async(
        db=db,
        document_id=ai_summary_request.document_id
    )
    if db_process_task is None:
        raise schemas.error.CustomException("Document must be processed before generating a summary", code=400)
    task_result = start_process_document_summarize.apply_async(
        kwargs={
            "document_id": db_document.id,
            "user_id": user.id,
            "model_id": selected_model_id,
        },
    )
    db_exist_summarize_task.celery_task_id = task_result.id
    await db.commit()

    return schemas.common.SuccessResponse()

@document_router.post('/embedding', response_model=schemas.common.NormalResponse)
async def create_embedding(
    embedding_request: schemas.document.DocumentEmbeddingRequest,
    user: models.user.User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_db)
):
    now = datetime.now(timezone.utc)
    db_document = await crud.document.get_document_by_document_id_async(
        db=db,
        document_id=embedding_request.document_id
    )
    if db_document is None:
        raise schemas.error.CustomException("Document not found", code=404)
    collaborator = await _get_document_collaborator(
        db=db,
        document_id=db_document.id,
        user_id=user.id,
    )
    ensure_document_write_access(
        is_creator=db_document.creator_id == user.id,
        has_document_write_access=_has_document_write_access(
            collaborator.authority if collaborator is not None else None
        ),
    )

    db_embedding_task = await crud.task.get_document_embedding_task_by_document_id_async(
        db=db,
        document_id=embedding_request.document_id
    )
    if db_embedding_task is not None:
        if db_embedding_task.status == DocumentEmbeddingStatus.SUCCESS:
            raise schemas.error.CustomException("Embedding task is already complete", code=409)
        if db_embedding_task.status == DocumentEmbeddingStatus.WAIT_TO:
            raise schemas.error.CustomException("Embedding task is already queued", code=409)
        if db_embedding_task.status == DocumentEmbeddingStatus.EMBEDDING:
            raise schemas.error.CustomException("Embedding task is already in progress", code=409)
        db_embedding_task.status = DocumentEmbeddingStatus.WAIT_TO
        db_embedding_task.celery_task_id = None
        db_embedding_task.update_time = now
    else:
        db_embedding_task = await crud.task.create_document_embedding_task_async(
            db=db,
            user_id=user.id,
            document_id=embedding_request.document_id,
            status=DocumentEmbeddingStatus.WAIT_TO,
        )

    db_process_task = await crud.task.get_document_process_task_by_document_id_async(
        db=db,
        document_id=embedding_request.document_id
    )
    if db_process_task is None:
        raise schemas.error.CustomException("Document must be processed before generating embeddings", code=400)
    task_result = start_process_document_embedding.apply_async(
        kwargs={
            "document_id": db_document.id,
            "user_id": user.id,
        },
    )
    db_embedding_task.celery_task_id = task_result.id
    await db.commit()

    return schemas.common.SuccessResponse()

@document_router.post('/transcribe', response_model=schemas.common.NormalResponse)
async def transcribe_audio_document(
    transcribe_request: schemas.document.DocumentTranscribeRequest,
    user: models.user.User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_db)
):
    now = datetime.now(timezone.utc)
    db_document = await crud.document.get_document_by_document_id_async(
        db=db,
        document_id=transcribe_request.document_id
    )
    if db_document is None:
        raise schemas.error.CustomException("Document not found", code=404)
    collaborator = await _get_document_collaborator(
        db=db,
        document_id=db_document.id,
        user_id=user.id,
    )
    ensure_document_write_access(
        is_creator=db_document.creator_id == user.id,
        has_document_write_access=_has_document_write_access(
            collaborator.authority if collaborator is not None else None
        ),
    )
    selected_engine_id = (
        transcribe_request.engine_id or user.default_audio_transcribe_engine_id
    )
    if selected_engine_id is None:
        raise schemas.error.CustomException(
            "Default audio transcribe engine is not configured",
            code=400,
        )
    await ensure_engine_access(
        db=db,
        user=user,
        engine_id=selected_engine_id,
    )

    db_transcribe_task = await crud.task.get_document_audio_transcribe_task_by_document_id_async(
        db=db,
        document_id=transcribe_request.document_id
    )
    if db_transcribe_task is not None:
        if db_transcribe_task.status == DocumentAudioTranscribeStatus.SUCCESS:
            raise schemas.error.CustomException("Transcription task is already complete", code=409)
        if db_transcribe_task.status == DocumentAudioTranscribeStatus.WAIT_TO:
            raise schemas.error.CustomException("Transcription task is already queued", code=409)
        if db_transcribe_task.status == DocumentAudioTranscribeStatus.TRANSCRIBING:
            raise schemas.error.CustomException("Transcription task is already in progress", code=409)
        db_transcribe_task.status = DocumentAudioTranscribeStatus.WAIT_TO
        db_transcribe_task.transcribed_text = None
        db_transcribe_task.celery_task_id = None
        db_transcribe_task.update_time = now
    else:
        db_transcribe_task = await crud.task.create_document_audio_transcribe_task_async(
            db=db,
            user_id=user.id,
            document_id=transcribe_request.document_id,
            status=DocumentAudioTranscribeStatus.WAIT_TO,
        )

    db_process_task = await crud.task.get_document_process_task_by_document_id_async(
        db=db,
        document_id=transcribe_request.document_id
    )
    if db_process_task is None:
        raise schemas.error.CustomException("Document must be processed before transcription", code=400)
    task_result = start_process_document_transcribe.apply_async(
        kwargs={
            "document_id": db_document.id,
            "user_id": user.id,
            "engine_id": selected_engine_id,
        },
    )
    db_transcribe_task.celery_task_id = task_result.id
    await db.commit()

    return schemas.common.SuccessResponse()


@document_router.post('/graph/generate', response_model=schemas.common.NormalResponse)
async def generate_graph(
    graph_generate_request: schemas.document.DocumentGraphGenerateRequest,
    user: models.user.User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_db)
):
    now = datetime.now(timezone.utc)
    db_document = await crud.document.get_document_by_document_id_async(
        db=db,
        document_id=graph_generate_request.document_id
    )
    if db_document is None:
        raise schemas.error.CustomException("Document not found", code=404)
    collaborator = await _get_document_collaborator(
        db=db,
        document_id=db_document.id,
        user_id=user.id,
    )
    ensure_document_write_access(
        is_creator=db_document.creator_id == user.id,
        has_document_write_access=_has_document_write_access(
            collaborator.authority if collaborator is not None else None
        ),
    )
    selected_model_id = graph_generate_request.model_id or user.default_document_reader_model_id
    if selected_model_id is None:
        raise schemas.error.CustomException(
            "Default document reader model is not configured",
            code=400,
        )
    await ensure_model_access(
        db=db,
        user=user,
        model_id=selected_model_id,
    )

    db_graph_generate_task = await crud.task.get_document_graph_task_by_document_id_async(
        db=db,
        document_id=graph_generate_request.document_id
    )
    if db_graph_generate_task is not None:
        if db_graph_generate_task.status == DocumentGraphStatus.SUCCESS:
            raise schemas.error.CustomException("Graph generation task is already complete", code=409)
        if db_graph_generate_task.status == DocumentGraphStatus.WAIT_TO:
            raise schemas.error.CustomException("Graph generation task is already queued", code=409)
        if db_graph_generate_task.status == DocumentGraphStatus.BUILDING:
            raise schemas.error.CustomException("Graph generation task is already in progress", code=409)
        db_graph_generate_task.status = DocumentGraphStatus.WAIT_TO
        db_graph_generate_task.celery_task_id = None
        db_graph_generate_task.update_time = now
    else:
        db_graph_generate_task = await crud.task.create_document_graph_task_async(
            db=db,
            user_id=user.id,
            document_id=graph_generate_request.document_id,
            status=DocumentGraphStatus.WAIT_TO,
        )

    db_process_task = await crud.task.get_document_process_task_by_document_id_async(
        db=db,
        document_id=graph_generate_request.document_id
    )
    if db_process_task is None:
        raise schemas.error.CustomException("Document must be processed before generating a graph", code=400)
    task_result = start_process_document_graph.apply_async(
        kwargs={
            "document_id": db_document.id,
            "user_id": user.id,
            "model_id": selected_model_id,
        },
    )
    db_graph_generate_task.celery_task_id = task_result.id
    await db.commit()

    return schemas.common.SuccessResponse()

@document_router.post('/podcast/generate', response_model=schemas.common.NormalResponse)
async def generate_podcast(
    generate_podcast_request: schemas.document.GenerateDocumentPodcastRequest,
    user: models.user.User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_db)
):
    now = datetime.now(timezone.utc)
    db_document = await crud.document.get_document_by_document_id_async(
        db=db,
        document_id=generate_podcast_request.document_id
    )
    if db_document is None:
        raise schemas.error.CustomException("Document not found", code=404)
    collaborator = await _get_document_collaborator(
        db=db,
        document_id=db_document.id,
        user_id=user.id,
    )
    ensure_document_write_access(
        is_creator=db_document.creator_id == user.id,
        has_document_write_access=_has_document_write_access(
            collaborator.authority if collaborator is not None else None
        ),
    )

    # podcast必须要存储系统，所以检查用户的存储系统配置
    if user.default_user_file_system is None:
        raise schemas.error.CustomException("Default file system is not configured", code=400)
    selected_engine_id = (
        generate_podcast_request.engine_id or user.default_podcast_user_engine_id
    )
    if selected_engine_id is None:
        raise schemas.error.CustomException(
            "Default podcast engine is not configured",
            code=400,
        )
    await ensure_engine_access(
        db=db,
        user=user,
        engine_id=selected_engine_id,
    )

    db_exist_podcast_task = await crud.task.get_document_podcast_task_by_document_id_async(
        db=db,
        document_id=generate_podcast_request.document_id
    )
    if db_exist_podcast_task is not None:
        if db_exist_podcast_task.status == DocumentPodcastStatus.WAIT_TO:
            raise schemas.error.CustomException("Podcast task is already queued", code=409)
        if db_exist_podcast_task.status == DocumentPodcastStatus.GENERATING:
            raise schemas.error.CustomException("Podcast task is already in progress", code=409)
        db_exist_podcast_task.status = DocumentPodcastStatus.WAIT_TO
        db_exist_podcast_task.podcast_file_name = None
        db_exist_podcast_task.podcast_script_file_name = None
        db_exist_podcast_task.celery_task_id = None
        db_exist_podcast_task.update_time = now
    else:
        db_exist_podcast_task = await crud.task.create_document_podcast_task_async(
            db=db,
            user_id=user.id,
            document_id=generate_podcast_request.document_id,
            status=DocumentPodcastStatus.WAIT_TO,
        )

    db_process_task = await crud.task.get_document_process_task_by_document_id_async(
        db=db,
        document_id=generate_podcast_request.document_id
    )
    if db_process_task is None:
        raise schemas.error.CustomException("Document must be processed before generating a podcast", code=400)
    task_result = start_process_document_podcast.apply_async(
        kwargs={
            "document_id": db_document.id,
            "user_id": user.id,
            "engine_id": selected_engine_id,
        },
    )
    db_exist_podcast_task.celery_task_id = task_result.id
    await db.commit()

    return schemas.common.SuccessResponse()

@document_router.post('/ai/summary/cancel', response_model=schemas.common.NormalResponse)
async def cancel_ai_summary(
    cancel_request: schemas.document.CancelDocumentTaskRequest,
    user: models.user.User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_db),
):
    db_document = await crud.document.get_document_by_document_id_async(db=db, document_id=cancel_request.document_id)
    if db_document is None:
        raise schemas.error.CustomException("Document not found", code=404)
    collaborator = await _get_document_collaborator(db=db, document_id=db_document.id, user_id=user.id)
    ensure_document_write_access(
        is_creator=db_document.creator_id == user.id,
        has_document_write_access=_has_document_write_access(
            collaborator.authority if collaborator is not None else None
        ),
    )
    cancelled_task = await crud.task.cancel_document_summarize_task_async(db=db, document_id=cancel_request.document_id)
    if cancelled_task is None:
        raise schemas.error.CustomException("No active summary task to cancel", code=409)
    revoke_task(cancelled_task.celery_task_id)
    cancelled_task.celery_task_id = None
    await db.commit()
    return schemas.common.SuccessResponse()


@document_router.post('/embedding/cancel', response_model=schemas.common.NormalResponse)
async def cancel_embedding(
    cancel_request: schemas.document.CancelDocumentTaskRequest,
    user: models.user.User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_db),
):
    db_document = await crud.document.get_document_by_document_id_async(db=db, document_id=cancel_request.document_id)
    if db_document is None:
        raise schemas.error.CustomException("Document not found", code=404)
    collaborator = await _get_document_collaborator(db=db, document_id=db_document.id, user_id=user.id)
    ensure_document_write_access(
        is_creator=db_document.creator_id == user.id,
        has_document_write_access=_has_document_write_access(
            collaborator.authority if collaborator is not None else None
        ),
    )
    cancelled_task = await crud.task.cancel_document_embedding_task_async(db=db, document_id=cancel_request.document_id)
    if cancelled_task is None:
        raise schemas.error.CustomException("No active embedding task to cancel", code=409)
    revoke_task(cancelled_task.celery_task_id)
    cancelled_task.celery_task_id = None
    await db.commit()
    return schemas.common.SuccessResponse()


@document_router.post('/transcribe/cancel', response_model=schemas.common.NormalResponse)
async def cancel_transcribe(
    cancel_request: schemas.document.CancelDocumentTaskRequest,
    user: models.user.User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_db),
):
    db_document = await crud.document.get_document_by_document_id_async(db=db, document_id=cancel_request.document_id)
    if db_document is None:
        raise schemas.error.CustomException("Document not found", code=404)
    collaborator = await _get_document_collaborator(db=db, document_id=db_document.id, user_id=user.id)
    ensure_document_write_access(
        is_creator=db_document.creator_id == user.id,
        has_document_write_access=_has_document_write_access(
            collaborator.authority if collaborator is not None else None
        ),
    )
    cancelled_task = await crud.task.cancel_document_transcribe_task_async(db=db, document_id=cancel_request.document_id)
    if cancelled_task is None:
        raise schemas.error.CustomException("No active transcription task to cancel", code=409)
    revoke_task(cancelled_task.celery_task_id)
    cancelled_task.celery_task_id = None
    await db.commit()
    return schemas.common.SuccessResponse()


@document_router.post('/graph/cancel', response_model=schemas.common.NormalResponse)
async def cancel_graph(
    cancel_request: schemas.document.CancelDocumentTaskRequest,
    user: models.user.User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_db),
):
    db_document = await crud.document.get_document_by_document_id_async(db=db, document_id=cancel_request.document_id)
    if db_document is None:
        raise schemas.error.CustomException("Document not found", code=404)
    collaborator = await _get_document_collaborator(db=db, document_id=db_document.id, user_id=user.id)
    ensure_document_write_access(
        is_creator=db_document.creator_id == user.id,
        has_document_write_access=_has_document_write_access(
            collaborator.authority if collaborator is not None else None
        ),
    )
    cancelled_task = await crud.task.cancel_document_graph_task_async(db=db, document_id=cancel_request.document_id)
    if cancelled_task is None:
        raise schemas.error.CustomException("No active graph task to cancel", code=409)
    revoke_task(cancelled_task.celery_task_id)
    cancelled_task.celery_task_id = None
    await db.commit()
    return schemas.common.SuccessResponse()


@document_router.post('/podcast/cancel', response_model=schemas.common.NormalResponse)
async def cancel_podcast(
    cancel_request: schemas.document.CancelDocumentTaskRequest,
    user: models.user.User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_db),
):
    db_document = await crud.document.get_document_by_document_id_async(db=db, document_id=cancel_request.document_id)
    if db_document is None:
        raise schemas.error.CustomException("Document not found", code=404)
    collaborator = await _get_document_collaborator(db=db, document_id=db_document.id, user_id=user.id)
    ensure_document_write_access(
        is_creator=db_document.creator_id == user.id,
        has_document_write_access=_has_document_write_access(
            collaborator.authority if collaborator is not None else None
        ),
    )
    cancelled_task = await crud.task.cancel_document_podcast_task_async(db=db, document_id=cancel_request.document_id)
    if cancelled_task is None:
        raise schemas.error.CustomException("No active podcast task to cancel", code=409)
    revoke_task(cancelled_task.celery_task_id)
    cancelled_task.celery_task_id = None
    await db.commit()
    return schemas.common.SuccessResponse()


@document_router.post('/month/summary', response_model=schemas.document.DocumentMonthSummaryResponse)
async def get_month_summary(
    db: AsyncSession = Depends(get_async_db),
    user: models.user.User = Depends(get_current_user)
):
    rows = await crud.document.get_document_summary_by_user_id_async(
        db=db,
        user_id=user.id
    )
    # 格式化数据
    summary_items = [schemas.document.SummaryItem(date=row.date, total=row.total) for row in rows]
    return schemas.document.DocumentMonthSummaryResponse(data=summary_items)

@document_router.post('/create', response_model=schemas.document.DocumentCreateResponse)
async def create_document(
    document_create_request: schemas.document.DocumentCreateRequest,
    db: AsyncSession = Depends(get_async_db),
    user: models.user.User = Depends(get_current_user),
    deployed_by_official = Depends(check_deployed_by_official),
    authorization: str = Depends(get_authorization_header),
    x_user_timezone: str | None = Header(default=None),
):
    if x_user_timezone is not None and x_user_timezone.strip():
        summary_timezone = normalize_timezone_name(x_user_timezone)
    else:
        summary_timezone = await get_cached_user_timezone(user.id)

    if document_create_request.category == DocumentCategory.WEBSITE:
        existing_website_document = None
        if document_create_request.url is not None and document_create_request.url.strip():
            existing_website_document = await crud.document.get_website_document_by_user_id_and_url_async(
                db=db,
                user_id=user.id,
                url=document_create_request.url.strip(),
            )
        if existing_website_document is None:
            db_website_documents_count = await crud.document.count_user_documents_async(
                db=db,
                user_id=user.id,
                filter_category=DocumentCategory.WEBSITE
            )
            if db_website_documents_count > 20 and deployed_by_official:
                auth_status = await plan_ability_checked_in_func(
                    ability=Ability.COLLECT_LINK.value,
                    authorization=authorization
                )
                if not auth_status:
                    raise schemas.error.CustomException("Website document limit reached for the current plan", code=403)
    elif document_create_request.category == DocumentCategory.FILE:
        db_file_documents_count = await crud.document.count_user_documents_async(
            db=db,
            user_id=user.id,
            filter_category=DocumentCategory.FILE
        )
        if db_file_documents_count > 20 and deployed_by_official:
            auth_status = await plan_ability_checked_in_func(
                ability=Ability.COLLECT_LINK.value,
                authorization=authorization
            )
            if not auth_status:
                raise schemas.error.CustomException("File document limit reached for the current plan", code=403)

    db_document = await create_document_for_user(
        db=db,
        user=user,
        document_create_request=document_create_request,
        summary_timezone=summary_timezone,
    )
    return schemas.document.DocumentCreateResponse(document_id=db_document.id)

@document_router.post('/markdown/transform', response_model=schemas.common.NormalResponse)
async def transform_markdown(
    transform_markdown_request: schemas.document.DocumentMarkdownConvertRequest,
    user: models.user.User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_db)
):
    now = datetime.now(timezone.utc)
    db_document = await crud.document.get_document_by_document_id_async(
        db=db,
        document_id=transform_markdown_request.document_id
    )
    if db_document is None:
        raise schemas.error.CustomException("Document not found", code=404)
    collaborator = await _get_document_collaborator(
        db=db,
        document_id=db_document.id,
        user_id=user.id,
    )
    ensure_document_write_access(
        is_creator=db_document.creator_id == user.id,
        has_document_write_access=_has_document_write_access(
            collaborator.authority if collaborator is not None else None
        ),
    )

    if user.default_user_file_system is None:
        raise schemas.error.CustomException("Default file system is not configured", code=400)

    db_process_task = await crud.task.get_document_process_task_by_document_id_async(
        db=db,
        document_id=transform_markdown_request.document_id
    )
    if db_process_task is None:
        raise schemas.error.CustomException("Document must be processed before Markdown conversion", code=400)

    db_convert_task = await crud.task.get_document_convert_task_by_document_id_async(
        db=db,
        document_id=transform_markdown_request.document_id
    )
    # 如果该文档的转化任务存在
    if db_convert_task is not None:
        if db_convert_task.status == DocumentMdConvertStatus.SUCCESS:
            raise schemas.error.CustomException("Markdown conversion task is already complete", code=409)
        elif db_convert_task.status == DocumentMdConvertStatus.WAIT_TO:
            raise schemas.error.CustomException("Markdown conversion task is already queued", code=409)
        elif db_convert_task.status == DocumentMdConvertStatus.CONVERTING:
            raise schemas.error.CustomException("Markdown conversion task is already in progress", code=409)
        db_convert_task.status = DocumentMdConvertStatus.WAIT_TO
        db_convert_task.update_time = now
    else:
        db_convert_task = await crud.task.create_document_convert_task_async(
            db=db,
            user_id=user.id,
            document_id=transform_markdown_request.document_id,
            status=DocumentMdConvertStatus.WAIT_TO,
        )
    await db.commit()

    # Background tasks
    start_process_document.delay(
        document_id=db_document.id,
        user_id=user.id,
        auto_summary=False,
        auto_podcast=True
    )

    return schemas.common.SuccessResponse()

@document_router.post('/update', response_model=schemas.common.NormalResponse)
async def update_document(
    document_update_request: schemas.document.DocumentUpdateRequest,
    db: AsyncSession = Depends(get_async_db),
    user: models.user.User = Depends(get_current_user)
):
    now = datetime.now(tz=timezone.utc)
    db_document = await crud.document.get_document_by_document_id_async(
        db=db,
        document_id=document_update_request.document_id
    )
    if db_document is None:
        raise schemas.error.CustomException("Document not found", code=404)
    collaborator = await _get_document_collaborator(
        db=db,
        document_id=db_document.id,
        user_id=user.id,
    )
    is_creator = db_document.creator_id == user.id
    ensure_document_write_access(
        is_creator=is_creator,
        has_document_write_access=_has_document_write_access(
            collaborator.authority if collaborator is not None else None
        ),
    )

    section_process_tasks = None
    if document_update_request.title is not None:
        db_document.title = document_update_request.title
    if document_update_request.description is not None:
        db_document.description = document_update_request.description
    if document_update_request.cover is not None:
        db_document.cover = document_update_request.cover
    if document_update_request.content is not None:
        if db_document.category != DocumentCategory.QUICK_NOTE:
            raise schemas.error.CustomException(
                "Only quick note documents support direct content updates",
                code=400,
            )
        db_quick_note_document = await crud.document.get_quick_note_document_by_document_id_async(
            db=db,
            document_id=document_update_request.document_id,
        )
        if db_quick_note_document is None:
            raise schemas.error.CustomException("Quick note content not found", code=404)
        db_quick_note_document.content = document_update_request.content
        db_document.content_update_time = now
    if document_update_request.labels is not None:
        exist_document_labels = await crud.document.get_document_labels_by_document_id_async(
            db=db,
            document_id=document_update_request.document_id
        )
        exist_document_label_ids = [
            label.id for label in exist_document_labels
        ]
        new_document_label_ids = [
            label_id for label_id in document_update_request.labels if label_id not in exist_document_label_ids
        ]
        await crud.document.create_document_labels_async(
            db=db,
            document_id=document_update_request.document_id,
            label_ids=new_document_label_ids
        )
        labels_to_delete = [
            label.id for label in exist_document_labels if label.id not in document_update_request.labels
        ]
        await crud.document.delete_document_labels_by_label_ids_async(
            db=db,
            label_ids=labels_to_delete
        )
    if document_update_request.sections is not None:
        ensure_document_manage_access(is_creator=is_creator)
        # 去重
        document_update_request.sections = list(dict.fromkeys(
            document_update_request.sections
        ))
        exist_document_sections = await crud.document.get_sections_by_document_id_async(
            db=db,
            document_id=document_update_request.document_id
        )
        exist_document_section_ids = [section.id for section in exist_document_sections]
        new_section_label_ids = [section_id for section_id in document_update_request.sections if section_id not in exist_document_section_ids]
        for section_id in new_section_label_ids:
            await crud.section.create_or_update_section_document_async(
                db=db,
                section_id=section_id,
                document_id=document_update_request.document_id,
                status=SectionDocumentIntegration.WAIT_TO
            )
        sections_to_delete = [section.id for section in exist_document_sections if section.id not in document_update_request.sections]
        for section_id in sections_to_delete:
            await crud.section.delete_section_document_by_section_id_and_document_id_async(
                db=db,
                section_id=section_id,
                document_id=document_update_request.document_id
            )
        if sorted(exist_document_section_ids) != sorted(document_update_request.sections):
            db_section_documents_and_sections = await crud.section.get_section_documents_and_sections_by_document_id_async(
                db=db,
                document_id=document_update_request.document_id
            )
            db_section_to_process = []
            for _, db_section in db_section_documents_and_sections:
                db_section_process_task = await crud.task.get_section_process_task_by_section_id_async(
                    db=db,
                    section_id=db_section.id
                )
                if db_section_process_task is not None and db_section_process_task.trigger_type == SectionProcessTriggerType.UPDATED:
                    db_section_to_process.append(db_section)
            # 构造每个 Section 的 Celery 任务
            section_process_tasks = group(
                start_process_section.si(
                    section_id=db_section.id,
                    user_id=user.id,
                    auto_podcast=db_section.auto_podcast
                )
                for db_section in db_section_to_process
            )
    db_document.update_time = now
    await db.commit()
    if section_process_tasks is not None:
        section_process_tasks.apply_async()
    return schemas.common.SuccessResponse()


@document_router.post('/touch-content', response_model=schemas.common.NormalResponse)
async def touch_document_content(
    request: schemas.document.DocumentDetailRequest,
    db: AsyncSession = Depends(get_async_db),
    user: models.user.User = Depends(get_current_user)
):
    if request.document_id is None:
        raise schemas.error.CustomException("document_id is required", code=400)
    db_document = await crud.document.get_document_by_document_id_async(
        db=db,
        document_id=request.document_id
    )
    if db_document is None:
        raise schemas.error.CustomException("Document not found", code=404)
    collaborator = await _get_document_collaborator(
        db=db,
        document_id=db_document.id,
        user_id=user.id
    )
    ensure_document_write_access(
        is_creator=db_document.creator_id == user.id,
        has_document_write_access=_has_document_write_access(
            collaborator.authority if collaborator is not None else None
        ),
    )
    db_document.content_update_time = datetime.now(timezone.utc)
    await db.commit()
    return schemas.common.SuccessResponse()
