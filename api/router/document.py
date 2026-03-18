from datetime import datetime, timezone

from celery import chain, group
from fastapi import APIRouter, Depends, Header
from sqlalchemy.orm import Session

import crud
import models
import schemas
from common.celery.app import (
    start_process_document,
    start_process_document_embedding,
    start_process_document_graph,
    start_process_document_podcast,
    start_process_document_summarize,
    start_process_document_transcribe,
    start_process_section,
    update_document_process_status,
)
from common.document_creation import create_document_for_user
from common.dependencies import (
    check_deployed_by_official,
    get_authorization_header,
    get_current_user,
    get_db,
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
    DocumentProcessStatus,
    DocumentSummarizeStatus,
)
from enums.section import SectionDocumentIntegration, SectionProcessTriggerType
from router.document_interaction_manage import document_interaction_manage_router
from router.document_query import document_query_router

document_router = APIRouter()
document_router.include_router(document_query_router)
document_router.include_router(document_interaction_manage_router)

@document_router.post('/label/summary', response_model=schemas.document.LabelSummaryResponse)
def get_label_summary(
    db: Session = Depends(get_db),
    user: models.user.User = Depends(get_current_user)
):
    res = []
    db_labels_summary = crud.document.get_labels_summary(
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
def delete_label(
    label_delete_request: schemas.document.LabelDeleteRequest,
    db: Session = Depends(get_db),
    user: models.user.User = Depends(get_current_user)
):
    crud.document.delete_labels_by_label_ids(
        db=db,
        label_ids=label_delete_request.label_ids,
        user_id=user.id
    )
    db.commit()
    return schemas.common.SuccessResponse()

@document_router.post("/label/list", response_model=schemas.document.LabelListResponse)
def list_label(
    db: Session = Depends(get_db),
    user: models.user.User = Depends(get_current_user)
):
    db_labels = crud.document.get_user_labels_by_user_id(
        db=db,
        user_id=user.id
    )
    labels = [
        schemas.document.DocumentLabel(id=label.id, name=label.name) for label in db_labels
    ]
    return schemas.document.LabelListResponse(data=labels)

@document_router.post('/label/create', response_model=schemas.document.CreateLabelResponse)
def add_label(
    label_add_request: schemas.document.LabelAddRequest,
    db: Session = Depends(get_db),
    user: models.user.User = Depends(get_current_user)
):
    db_label = crud.document.create_document_label(
        db=db,
        name=label_add_request.name,
        user_id=user.id
    )
    db.commit()
    return schemas.document.CreateLabelResponse(id=db_label.id, name=db_label.name)

@document_router.post('/note/create', response_model=schemas.common.NormalResponse)
def create_note(
    note_create_request: schemas.document.DocumentNoteCreateRequest,
    user: models.user.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    crud.document.create_document_note(
        db=db,
        user_id=user.id,
        document_id=note_create_request.document_id,
        content=note_create_request.content
    )
    db.commit()
    return schemas.common.SuccessResponse()

@document_router.post('/note/delete', response_model=schemas.common.NormalResponse)
def delete_note(
    note_delete_request: schemas.document.DocumentNoteDeleteRequest,
    user: models.user.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    crud.document.delete_document_notes_by_user_id_and_note_ids(
        db=db,
        user_id=user.id,
        note_ids=note_delete_request.document_note_ids
    )
    db.commit()
    return schemas.common.SuccessResponse()

@document_router.post('/note/search', response_model=schemas.pagination.InifiniteScrollPagnition[schemas.document.DocumentNoteInfo])
def search_note(
    search_note_request: schemas.document.SearchDocumentNoteRequest,
    user: models.user.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    has_more = True
    next_start = None
    next_note = None
    notes = crud.document.search_all_document_notes_by_document_id(
        db=db,
        document_id=search_note_request.document_id,
        start=search_note_request.start,
        limit=search_note_request.limit,
        keyword=search_note_request.keyword
    )
    if len(notes) < search_note_request.limit or len(notes) == 0:
        has_more = False
    if len(notes) == search_note_request.limit:
        next_note = crud.document.search_next_note_by_document_note(
            db=db,
            document_note=notes[-1],
            keyword=search_note_request.keyword
        )
        has_more = next_note is not None
        next_start = next_note.id if next_note is not None else None
    total = crud.document.count_all_document_notes_by_document_id(
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
    db: Session = Depends(get_db)
):
    db_document = crud.document.get_document_by_document_id(
        db=db,
        document_id=ai_summary_request.document_id
    )
    if db_document is None:
        raise schemas.error.CustomException("Document not found", code=404)
    if user.default_document_reader_model_id is None:
        raise schemas.error.CustomException(
            "Default document reader model is not configured",
            code=400,
        )
    await ensure_model_access(
        db=db,
        user=user,
        model_id=user.default_document_reader_model_id,
    )

    db_exist_summarize_task = crud.task.get_document_summarize_task_by_document_id(
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
        db_exist_summarize_task.update_time = datetime.now(timezone.utc)

    db_process_task = crud.task.get_document_process_task_by_document_id(
        db=db,
        document_id=ai_summary_request.document_id
    )
    if db_process_task is None:
        raise schemas.error.CustomException("Document must be processed before generating a summary", code=400)
    db_process_task.status = DocumentProcessStatus.PROCESSING
    db_process_task.update_time = datetime.now(timezone.utc)
    db.commit()

    workflow = chain(
        start_process_document_summarize.si(
            document_id=db_document.id,
            user_id=user.id
        ),
        update_document_process_status.si(
            document_id=db_document.id,
            status=DocumentProcessStatus.SUCCESS
        )
    )
    workflow()

    return schemas.common.SuccessResponse()

@document_router.post('/embedding', response_model=schemas.common.NormalResponse)
async def create_embedding(
    embedding_request: schemas.document.DocumentEmbeddingRequest,
    user: models.user.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    db_document = crud.document.get_document_by_document_id(
        db=db,
        document_id=embedding_request.document_id
    )
    if db_document is None:
        raise schemas.error.CustomException("Document not found", code=404)

    db_embedding_task = crud.task.get_document_embedding_task_by_document_id(
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

    db_process_task = crud.task.get_document_process_task_by_document_id(
        db=db,
        document_id=embedding_request.document_id
    )
    if db_process_task is None:
        raise schemas.error.CustomException("Document must be processed before generating embeddings", code=400)
    db_process_task.status = DocumentProcessStatus.PROCESSING
    db.commit()

    workflow = chain(
        start_process_document_embedding.si(
            document_id=db_document.id,
            user_id=user.id
        ),
        update_document_process_status.si(
            document_id=db_document.id,
            status=DocumentProcessStatus.SUCCESS
        )
    )
    workflow()

    return schemas.common.SuccessResponse()

@document_router.post('/transcribe', response_model=schemas.common.NormalResponse)
async def transcribe_audio_document(
    transcribe_request: schemas.document.DocumentTranscribeRequest,
    user: models.user.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    db_document = crud.document.get_document_by_document_id(
        db=db,
        document_id=transcribe_request.document_id
    )
    if db_document is None:
        raise schemas.error.CustomException("Document not found", code=404)
    if user.default_audio_transcribe_engine_id is None:
        raise schemas.error.CustomException(
            "Default audio transcribe engine is not configured",
            code=400,
        )
    await ensure_engine_access(
        db=db,
        user=user,
        engine_id=user.default_audio_transcribe_engine_id,
    )

    db_transcribe_task = crud.task.get_document_audio_transcribe_task_by_document_id(
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

    db_process_task = crud.task.get_document_process_task_by_document_id(
        db=db,
        document_id=transcribe_request.document_id
    )
    if db_process_task is None:
        raise schemas.error.CustomException("Document must be processed before transcription", code=400)
    db_process_task.status = DocumentProcessStatus.PROCESSING
    db.commit()

    workflow = chain(
        start_process_document_transcribe.si(
            document_id=db_document.id,
            user_id=user.id
        ),
        update_document_process_status.si(
            document_id=db_document.id,
            status=DocumentProcessStatus.SUCCESS
        )
    )
    workflow()

    return schemas.common.SuccessResponse()


@document_router.post('/graph/generate', response_model=schemas.common.NormalResponse)
async def generate_graph(
    graph_generate_request: schemas.document.DocumentGraphGenerateRequest,
    user: models.user.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    db_document = crud.document.get_document_by_document_id(
        db=db,
        document_id=graph_generate_request.document_id
    )
    if db_document is None:
        raise schemas.error.CustomException("Document not found", code=404)

    db_graph_generate_task = crud.task.get_document_graph_task_by_document_id(
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

    db_process_task = crud.task.get_document_process_task_by_document_id(
        db=db,
        document_id=graph_generate_request.document_id
    )
    if db_process_task is None:
        raise schemas.error.CustomException("Document must be processed before generating a graph", code=400)
    db_process_task.status = DocumentProcessStatus.PROCESSING
    db.commit()

    workflow = chain(
        start_process_document_graph.si(
            document_id=db_document.id,
            user_id=user.id
        ),
        update_document_process_status.si(
            document_id=db_document.id,
            status=DocumentProcessStatus.SUCCESS
        )
    )
    workflow()

    return schemas.common.SuccessResponse()

@document_router.post('/podcast/generate', response_model=schemas.common.NormalResponse)
async def generate_podcast(
    generate_podcast_request: schemas.document.GenerateDocumentPodcastRequest,
    user: models.user.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    db_document = crud.document.get_document_by_document_id(
        db=db,
        document_id=generate_podcast_request.document_id
    )
    if db_document is None:
        raise schemas.error.CustomException("Document not found", code=404)

    # podcast必须要存储系统，所以检查用户的存储系统配置
    if user.default_user_file_system is None:
        raise schemas.error.CustomException("Default file system is not configured", code=400)
    if user.default_podcast_user_engine_id is None:
        raise schemas.error.CustomException(
            "Default podcast engine is not configured",
            code=400,
        )
    await ensure_engine_access(
        db=db,
        user=user,
        engine_id=user.default_podcast_user_engine_id,
    )

    db_exist_podcast_task = crud.task.get_document_podcast_task_by_document_id(
        db=db,
        document_id=generate_podcast_request.document_id
    )
    if db_exist_podcast_task is not None:
        if db_exist_podcast_task.status == DocumentPodcastStatus.SUCCESS:
            raise schemas.error.CustomException("Podcast task is already complete", code=409)
        if db_exist_podcast_task.status == DocumentPodcastStatus.WAIT_TO:
            raise schemas.error.CustomException("Podcast task is already queued", code=409)
        if db_exist_podcast_task.status == DocumentPodcastStatus.GENERATING:
            raise schemas.error.CustomException("Podcast task is already in progress", code=409)

    db_process_task = crud.task.get_document_process_task_by_document_id(
        db=db,
        document_id=generate_podcast_request.document_id
    )
    if db_process_task is None:
        raise schemas.error.CustomException("Document must be processed before generating a podcast", code=400)
    db_process_task.status = DocumentProcessStatus.PROCESSING
    db.commit()

    workflow = chain(
        start_process_document_podcast.si(
            document_id=db_document.id,
            user_id=user.id
        ),
        update_document_process_status.si(
            document_id=db_document.id,
            status=DocumentProcessStatus.SUCCESS
        )
    )
    workflow()

    return schemas.common.SuccessResponse()

@document_router.post('/month/summary', response_model=schemas.document.DocumentMonthSummaryResponse)
def get_month_summary(
    db: Session = Depends(get_db),
    user: models.user.User = Depends(get_current_user)
):
    rows = crud.document.get_document_summary_by_user_id(
        db=db,
        user_id=user.id
    )
    # 格式化数据
    summary_items = [schemas.document.SummaryItem(date=row.date, total=row.total) for row in rows]
    return schemas.document.DocumentMonthSummaryResponse(data=summary_items)

@document_router.post('/create', response_model=schemas.document.DocumentCreateResponse)
async def create_document(
    document_create_request: schemas.document.DocumentCreateRequest,
    db: Session = Depends(get_db),
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
        db_website_documents_count = crud.document.count_user_documents(
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
        db_file_documents_count = crud.document.count_user_documents(
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

    if document_create_request.category == DocumentCategory.WEBSITE:
        if user.default_website_document_parse_user_engine_id is None:
            raise schemas.error.CustomException(
                "Default website parse engine is not configured",
                code=400,
            )
        await ensure_engine_access(
            db=db,
            user=user,
            engine_id=user.default_website_document_parse_user_engine_id,
        )
    elif document_create_request.category in (
        DocumentCategory.FILE,
        DocumentCategory.AUDIO,
    ):
        if user.default_file_document_parse_user_engine_id is None:
            raise schemas.error.CustomException(
                "Default file parse engine is not configured",
                code=400,
            )
        await ensure_engine_access(
            db=db,
            user=user,
            engine_id=user.default_file_document_parse_user_engine_id,
        )

    if document_create_request.auto_summary or document_create_request.auto_tag:
        if user.default_document_reader_model_id is None:
            raise schemas.error.CustomException(
                "Default document reader model is not configured",
                code=400,
            )
        await ensure_model_access(
            db=db,
            user=user,
            model_id=user.default_document_reader_model_id,
        )

    if document_create_request.auto_podcast:
        if user.default_podcast_user_engine_id is None:
            raise schemas.error.CustomException(
                "Default podcast engine is not configured",
                code=400,
            )
        await ensure_engine_access(
            db=db,
            user=user,
            engine_id=user.default_podcast_user_engine_id,
        )

    if document_create_request.auto_transcribe:
        if user.default_audio_transcribe_engine_id is None:
            raise schemas.error.CustomException(
                "Default audio transcribe engine is not configured",
                code=400,
            )
        await ensure_engine_access(
            db=db,
            user=user,
            engine_id=user.default_audio_transcribe_engine_id,
        )

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
    db: Session = Depends(get_db)
):
    db_document = crud.document.get_document_by_document_id(
        db=db,
        document_id=transform_markdown_request.document_id
    )
    if db_document is None:
        raise schemas.error.CustomException("Document not found", code=404)

    if user.default_user_file_system is None:
        raise schemas.error.CustomException("Default file system is not configured", code=400)

    db_process_task = crud.task.get_document_process_task_by_document_id(
        db=db,
        document_id=transform_markdown_request.document_id
    )
    if db_process_task is None:
        raise schemas.error.CustomException("Document must be processed before Markdown conversion", code=400)
    db_process_task.status = DocumentProcessStatus.PROCESSING

    db_convert_task = crud.task.get_document_convert_task_by_document_id(
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
    db.commit()

    # Background tasks
    start_process_document.delay(
        document_id=db_document.id,
        user_id=user.id,
        auto_summary=False,
        auto_podcast=True
    )

    return schemas.common.SuccessResponse()

@document_router.post('/update', response_model=schemas.common.NormalResponse)
def update_document(
    document_update_request: schemas.document.DocumentUpdateRequest,
    db: Session = Depends(get_db),
    user: models.user.User = Depends(get_current_user)
):
    now = datetime.now(tz=timezone.utc)
    db_document = crud.document.get_document_by_document_id(
        db=db,
        document_id=document_update_request.document_id
    )
    if db_document is None:
        raise schemas.error.CustomException("Document not found", code=404)

    if db_document.creator_id != user.id:
        raise schemas.error.CustomException("You don't have permission to update this document", code=403)

    section_process_tasks = None
    if document_update_request.title is not None:
        db_document.title = document_update_request.title
    if document_update_request.description is not None:
        db_document.description = document_update_request.description
    if document_update_request.cover is not None:
        db_document.cover = document_update_request.cover
    if document_update_request.labels is not None:
        exist_document_labels = crud.document.get_document_labels_by_document_id(
            db=db,
            document_id=document_update_request.document_id
        )
        exist_document_label_ids = [
            label.id for label in exist_document_labels
        ]
        new_document_label_ids = [
            label_id for label_id in document_update_request.labels if label_id not in exist_document_label_ids
        ]
        crud.document.create_document_labels(
            db=db,
            document_id=document_update_request.document_id,
            label_ids=new_document_label_ids
        )
        labels_to_delete = [
            label.id for label in exist_document_labels if label.id not in document_update_request.labels
        ]
        crud.document.delete_document_labels_by_label_ids(
            db=db,
            label_ids=labels_to_delete
        )
    if document_update_request.sections is not None:
        # 去重
        document_update_request.sections = list(dict.fromkeys(
            document_update_request.sections
        ))
        exist_document_sections = crud.document.get_sections_by_document_id(
            db=db,
            document_id=document_update_request.document_id
        )
        exist_document_section_ids = [section.id for section in exist_document_sections]
        new_section_label_ids = [section_id for section_id in document_update_request.sections if section_id not in exist_document_section_ids]
        for section_id in new_section_label_ids:
            crud.section.create_or_update_section_document(
                db=db,
                section_id=section_id,
                document_id=document_update_request.document_id,
                status=SectionDocumentIntegration.WAIT_TO
            )
        sections_to_delete = [section.id for section in exist_document_sections if section.id not in document_update_request.sections]
        for section_id in sections_to_delete:
            crud.section.delete_section_document_by_section_id_and_document_id(
                db=db,
                section_id=section_id,
                document_id=document_update_request.document_id
            )
        if sorted(exist_document_section_ids) != sorted(document_update_request.sections):
            db_section_documents_and_sections = crud.section.get_section_documents_and_sections_by_document_id(
                db=db,
                document_id=document_update_request.document_id
            )
            db_section_to_process = []
            for _, db_section in db_section_documents_and_sections:
                db_section_process_task = crud.task.get_section_process_task_by_section_id(
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
    db.commit()
    if section_process_tasks is not None:
        section_process_tasks.apply_async()
    return schemas.common.SuccessResponse()
