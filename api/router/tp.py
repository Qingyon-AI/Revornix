# 第三方接口
#
# 当使用 api key 的时候, 调用这边的接口组

from fastapi import APIRouter, Depends, File, Form, Header, UploadFile
from sqlalchemy.orm import Session

import crud
import models
import schemas
from common.dependencies import (
    check_deployed_by_official,
    get_current_user_with_api_key,
    get_db,
    get_request_timezone,
    plan_ability_checked_in_func,
)
from common.document_creation import create_document_for_user
from common.jwt_utils import create_token
from common.timezone import (
    get_cached_user_timezone,
    normalize_timezone_name,
    today_in_timezone,
)
from common.upload_limits import validate_file_upload_size
from enums.ability import Ability
from enums.document import DocumentCategory
from enums.section import UserSectionRole
from proxy.file_system_proxy import FileSystemProxy
from router.document import update_document as update_document_impl
from router.document import (
    create_ai_summary as create_ai_summary_impl,
    create_embedding as create_embedding_impl,
    generate_graph as generate_document_graph_impl,
    generate_podcast as generate_document_podcast_impl,
    get_month_summary as get_month_summary_impl,
    transform_markdown as transform_markdown_impl,
    transcribe_audio_document as transcribe_audio_document_impl,
)
from router.document_interaction_manage import delete_document as delete_document_impl
from router.document_query import (
    get_document_detail as get_document_detail_impl,
    recent_read_document as recent_read_document_impl,
    search_knowledge_vector as search_knowledge_vector_impl,
    search_all_mine_documents as search_all_mine_documents_impl,
    search_my_star_documents as search_my_star_documents_impl,
    search_user_unread_documents as search_user_unread_documents_impl,
)
from router.graph import (
    document_graph as document_graph_impl,
    graph as graph_impl,
    section_graph as section_graph_impl,
)
from router.section import (
    create_section as create_section_impl,
    delete_section as delete_section_impl,
    generate_podcast as generate_section_podcast_impl,
    generate_ppt as generate_section_ppt_impl,
    retry_section_document_integration as retry_section_document_integration_impl,
    trigger_section_process as trigger_section_process_impl,
    update_section as update_section_impl,
)
from router.section_comment_manage import (
    create_section_comment as create_section_comment_impl,
    delete_section_comment as delete_section_comment_impl,
    search_section_comment as search_section_comment_impl,
)
from router.section_detail_query import (
    get_date_section_info as get_date_section_info_impl,
    get_section_detail as get_section_detail_impl,
    section_document_request as section_document_request_impl,
)
from router.section_publish_manage import (
    section_publish_get_request as section_publish_get_request_impl,
    section_publish_request as section_publish_request_impl,
    section_republish as section_republish_impl,
)
from router.section_search_query import (
    get_my_subscribed_sections as get_my_subscribed_sections_impl,
    public_sections as public_sections_impl,
    search_mine_sections as search_mine_sections_impl,
    search_user_sections as search_user_sections_impl,
)

tp_router = APIRouter()

@tp_router.post('/file/upload', response_model=schemas.common.NormalResponse)
async def upload_file_system(
    file: UploadFile = File(...),
    file_path: str = Form(...),
    content_type: str = Form(...),
    db: Session = Depends(get_db),
    user: models.user.User = Depends(get_current_user_with_api_key)
):
    if user.default_user_file_system is None:
        raise schemas.error.CustomException(message="Default file system is not configured", code=400)
    user_file_system = crud.file_system.get_user_file_system_by_id(
        db=db,
        user_file_system_id=user.default_user_file_system
    )
    if user_file_system is None:
        raise schemas.error.CustomException(message="User file system is invalid", code=400)

    remote_file_service = await FileSystemProxy.create(
        user_id=user.id
    )
    content = await file.read()
    normalized_file_path = file_path.lstrip("/")
    validate_file_upload_size(file_path=normalized_file_path, size=len(content))
    await remote_file_service.upload_raw_content_to_path(
        file_path=normalized_file_path,
        content=content,
        content_type=content_type
    )
    return schemas.common.SuccessResponse()

@tp_router.post('/section/create', response_model=schemas.section.SectionCreateResponse)
async def create_section(
    section_create_request: schemas.section.SectionCreateRequest,
    db: Session = Depends(get_db),
    user: models.user.User = Depends(get_current_user_with_api_key),
    request_timezone: str = Depends(get_request_timezone),
):
    return await create_section_impl(
        section_create_request=section_create_request,
        db=db,
        user=user,
        request_timezone=request_timezone,
    )


@tp_router.post('/section/update', response_model=schemas.common.NormalResponse)
async def update_section(
    section_update_request: schemas.section.SectionUpdateRequest,
    db: Session = Depends(get_db),
    user: models.user.User = Depends(get_current_user_with_api_key),
    request_timezone: str = Depends(get_request_timezone),
):
    return await update_section_impl(
        section_update_request=section_update_request,
        db=db,
        user=user,
        request_timezone=request_timezone,
    )


@tp_router.post('/section/delete', response_model=schemas.common.NormalResponse)
def delete_section(
    section_delete_request: schemas.section.SectionDeleteRequest,
    db: Session = Depends(get_db),
    user: models.user.User = Depends(get_current_user_with_api_key),
):
    return delete_section_impl(
        section_delete_request=section_delete_request,
        db=db,
        user=user,
    )


@tp_router.post('/section/detail', response_model=schemas.section.SectionInfo)
async def get_section_detail(
    section_detail_request: schemas.section.SectionDetailRequest,
    db: Session = Depends(get_db),
    user: models.user.User = Depends(get_current_user_with_api_key),
):
    return await get_section_detail_impl(
        section_detail_request=section_detail_request,
        db=db,
        user=user,
    )


@tp_router.post('/section/date', response_model=schemas.section.DaySectionResponse)
async def get_section_date(
    day_section_request: schemas.section.DaySectionRequest,
    db: Session = Depends(get_db),
    user: models.user.User = Depends(get_current_user_with_api_key),
):
    return await get_date_section_info_impl(
        day_section_request=day_section_request,
        db=db,
        user=user,
    )


@tp_router.post(
    '/section/documents',
    response_model=schemas.pagination.InifiniteScrollPagnition[schemas.section.SectionDocumentInfo],
)
def get_section_documents(
    section_document_request: schemas.section.SectionDocumentRequest,
    db: Session = Depends(get_db),
    user: models.user.User = Depends(get_current_user_with_api_key),
):
    return section_document_request_impl(
        section_document_request=section_document_request,
        db=db,
        user=user,
    )


@tp_router.post('/section/comment/create', response_model=schemas.common.NormalResponse)
def create_section_comment(
    section_comment_create_request: schemas.section.SectionCommentCreateRequest,
    db: Session = Depends(get_db),
    user: models.user.User = Depends(get_current_user_with_api_key),
):
    return create_section_comment_impl(
        section_comment_create_request=section_comment_create_request,
        db=db,
        user=user,
    )


@tp_router.post(
    '/section/comment/search',
    response_model=schemas.pagination.InifiniteScrollPagnition[schemas.section.SectionCommentInfo],
)
def search_section_comment(
    section_comment_search_request: schemas.section.SectionCommentSearchRequest,
    db: Session = Depends(get_db),
    user: models.user.User = Depends(get_current_user_with_api_key),
):
    return search_section_comment_impl(
        section_comment_search_request=section_comment_search_request,
        db=db,
        user=user,
    )


@tp_router.post('/section/comment/delete', response_model=schemas.common.NormalResponse)
def delete_section_comment(
    section_comment_delete_request: schemas.section.SectionCommentDeleteRequest,
    db: Session = Depends(get_db),
    user: models.user.User = Depends(get_current_user_with_api_key),
):
    return delete_section_comment_impl(
        section_comment_delete_request=section_comment_delete_request,
        db=db,
        user=user,
    )


@tp_router.post(
    '/section/mine/search',
    response_model=schemas.pagination.InifiniteScrollPagnition[schemas.section.SectionInfo],
)
async def search_mine_sections(
    search_mine_sections_request: schemas.section.SearchMineSectionsRequest,
    db: Session = Depends(get_db),
    user: models.user.User = Depends(get_current_user_with_api_key),
):
    return await search_mine_sections_impl(
        search_mine_sections_request=search_mine_sections_request,
        db=db,
        user=user,
    )


@tp_router.post(
    '/section/subscribed',
    response_model=schemas.pagination.InifiniteScrollPagnition[schemas.section.SectionInfo],
)
async def get_subscribed_sections(
    search_subscribed_section_request: schemas.section.SearchSubscribedSectionRequest,
    db: Session = Depends(get_db),
    user: models.user.User = Depends(get_current_user_with_api_key),
):
    return await get_my_subscribed_sections_impl(
        search_subscribed_section_request=search_subscribed_section_request,
        db=db,
        user=user,
    )


@tp_router.post(
    '/section/public/search',
    response_model=schemas.pagination.InifiniteScrollPagnition[schemas.section.SectionInfo],
)
async def search_public_sections(
    search_public_sections_request: schemas.section.SearchPublicSectionsRequest,
    db: Session = Depends(get_db),
    user: models.user.User = Depends(get_current_user_with_api_key),
):
    return await public_sections_impl(
        search_public_sections_request=search_public_sections_request,
        db=db,
        user=user,
    )


@tp_router.post(
    '/section/user/search',
    response_model=schemas.pagination.InifiniteScrollPagnition[schemas.section.SectionInfo],
)
async def search_user_sections(
    search_user_sections_request: schemas.section.SearchUserSectionsRequest,
    db: Session = Depends(get_db),
    user: models.user.User = Depends(get_current_user_with_api_key),
):
    return await search_user_sections_impl(
        search_user_sections_request=search_user_sections_request,
        db=db,
        user=user,
    )

@tp_router.post('/section/label/create', response_model=schemas.section.CreateLabelResponse)
def add_label(
    label_add_request: schemas.section.LabelAddRequest,
    db: Session = Depends(get_db),
    user: models.user.User = Depends(get_current_user_with_api_key)
):
    db_label = crud.section.create_section_label(
        db=db,
        name=label_add_request.name,
        user_id=user.id
    )
    db.commit()
    return schemas.section.CreateLabelResponse(
        id=db_label.id,
        name=db_label.name
    )


@tp_router.post('/section/label/list', response_model=schemas.section.LabelListResponse)
def list_section_label(
    db: Session = Depends(get_db),
    user: models.user.User = Depends(get_current_user_with_api_key),
):
    db_labels = crud.section.get_user_labels_by_user_id(
        db=db,
        user_id=user.id,
    )
    labels = [
        schemas.section.SectionLabel(id=label.id, name=label.name)
        for label in db_labels
    ]
    return schemas.section.LabelListResponse(data=labels)


@tp_router.post('/section/label/delete', response_model=schemas.common.NormalResponse)
def delete_section_label(
    label_delete_request: schemas.section.LabelDeleteRequest,
    db: Session = Depends(get_db),
    user: models.user.User = Depends(get_current_user_with_api_key),
):
    crud.section.delete_labels_by_label_ids(
        db=db,
        label_ids=label_delete_request.label_ids,
        user_id=user.id,
    )
    db.commit()
    return schemas.common.SuccessResponse()

@tp_router.post('/section/mine/all', response_model=schemas.section.AllMySectionsResponse)
def get_all_mine_sections(
    db: Session = Depends(get_db),
    user: models.user.User = Depends(get_current_user_with_api_key)
):
    db_sections = crud.section.get_user_sections(
        db=db,
        user_id=user.id,
        filter_roles=[UserSectionRole.CREATOR, UserSectionRole.MEMBER]
    )
    sections = [
        schemas.section.BaseSectionInfo.model_validate(db_section)
        for db_section in db_sections
    ]
    return schemas.section.AllMySectionsResponse(data=sections)


@tp_router.post('/section/podcast/generate', response_model=schemas.common.NormalResponse)
async def generate_section_podcast(
    generate_podcast_request: schemas.section.GenerateSectionPodcastRequest,
    db: Session = Depends(get_db),
    user: models.user.User = Depends(get_current_user_with_api_key),
):
    return await generate_section_podcast_impl(
        generate_podcast_request=generate_podcast_request,
        user=user,
        db=db,
    )


@tp_router.post('/section/ppt/generate', response_model=schemas.common.NormalResponse)
async def generate_section_ppt(
    generate_ppt_request: schemas.section.GenerateSectionPptRequest,
    db: Session = Depends(get_db),
    user: models.user.User = Depends(get_current_user_with_api_key),
):
    return await generate_section_ppt_impl(
        generate_ppt_request=generate_ppt_request,
        user=user,
        db=db,
    )


@tp_router.post('/section/process/trigger', response_model=schemas.common.NormalResponse)
async def trigger_section_process(
    trigger_process_request: schemas.section.TriggerSectionProcessRequest,
    db: Session = Depends(get_db),
    user: models.user.User = Depends(get_current_user_with_api_key),
):
    return await trigger_section_process_impl(
        trigger_process_request=trigger_process_request,
        user=user,
        db=db,
    )


@tp_router.post('/section/document/retry', response_model=schemas.common.NormalResponse)
def retry_section_document(
    retry_request: schemas.section.RetrySectionDocumentRequest,
    db: Session = Depends(get_db),
    user: models.user.User = Depends(get_current_user_with_api_key),
):
    return retry_section_document_integration_impl(
        retry_request=retry_request,
        user=user,
        db=db,
    )


@tp_router.post('/section/publish', response_model=schemas.common.NormalResponse)
def publish_section(
    section_publish_request: schemas.section.SectionPublishRequest,
    db: Session = Depends(get_db),
    user: models.user.User = Depends(get_current_user_with_api_key),
):
    return section_publish_request_impl(
        section_publish_request=section_publish_request,
        db=db,
        user=user,
    )


@tp_router.post('/section/publish/get', response_model=schemas.section.SectionPublishGetResponse)
def get_section_publish(
    section_publish_get_request: schemas.section.SectionPublishGetRequest,
    db: Session = Depends(get_db),
    user: models.user.User = Depends(get_current_user_with_api_key),
):
    return section_publish_get_request_impl(
        section_publish_get_request=section_publish_get_request,
        db=db,
        user=user,
    )


@tp_router.post('/section/republish', response_model=schemas.common.NormalResponse)
def republish_section(
    section_republish_request: schemas.section.SectionRePublishRequest,
    db: Session = Depends(get_db),
    user: models.user.User = Depends(get_current_user_with_api_key),
):
    return section_republish_impl(
        section_republish_request=section_republish_request,
        db=db,
        user=user,
    )

@tp_router.post("/document/label/list", response_model=schemas.document.LabelListResponse)
def list_label(
    db: Session = Depends(get_db),
    user: models.user.User = Depends(get_current_user_with_api_key)
):
    db_labels = crud.document.get_user_labels_by_user_id(
        db=db,
        user_id=user.id
    )
    labels = [
        schemas.document.DocumentLabel.model_validate(db_label)
        for db_label in db_labels
    ]
    return schemas.document.LabelListResponse(data=labels)

@tp_router.post("/document/label/create", response_model=schemas.document.CreateLabelResponse)
def create_document_label(
    label_add_request: schemas.document.LabelAddRequest,
    db: Session = Depends(get_db),
    user: models.user.User = Depends(get_current_user_with_api_key)
):
    db_label = crud.document.create_document_label(
        db=db,
        name=label_add_request.name,
        user_id=user.id
    )
    db.commit()
    return schemas.document.CreateLabelResponse(
        id=db_label.id,
        name=db_label.name
    )


@tp_router.post("/document/label/delete", response_model=schemas.common.NormalResponse)
def delete_document_label(
    label_delete_request: schemas.document.LabelDeleteRequest,
    db: Session = Depends(get_db),
    user: models.user.User = Depends(get_current_user_with_api_key),
):
    crud.document.delete_labels_by_label_ids(
        db=db,
        label_ids=label_delete_request.label_ids,
        user_id=user.id,
    )
    db.commit()
    return schemas.common.SuccessResponse()


@tp_router.post("/document/create", response_model=schemas.document.DocumentCreateResponse)
async def create_document(
    document_create_request: schemas.document.ApiDocumentCreateRequest,
    db: Session = Depends(get_db),
    user: models.user.User = Depends(get_current_user_with_api_key),
    deployed_by_official: bool = Depends(check_deployed_by_official),
    x_user_timezone: str | None = Header(default=None),
):
    if x_user_timezone is not None and x_user_timezone.strip():
        user_timezone = normalize_timezone_name(x_user_timezone)
    else:
        user_timezone = await get_cached_user_timezone(user.id)
    summary_date = today_in_timezone(user_timezone)
    access_token, _ = create_token(
        user=user
    )
    db_api_plat_user_documents = crud.document.count_user_documents(
        db=db,
        user_id=user.id,
        filter_platform='api',
        filter_date=summary_date,
        filter_timezone=user_timezone,
    )
    auth_status = True
    if db_api_plat_user_documents > 10 and db_api_plat_user_documents < 25 and deployed_by_official:
        auth_status = await plan_ability_checked_in_func(
            ability=Ability.API_COLLECT_LIMITED.value,
            authorization=f'Bearer {access_token}'
        )
    if db_api_plat_user_documents >= 25 and db_api_plat_user_documents < 50 and deployed_by_official:
        auth_status = await plan_ability_checked_in_func(
            ability=Ability.API_COLLECT_LIMITED_MORE.value,
            authorization=f'Bearer {access_token}'
        )
    if db_api_plat_user_documents >= 50 and deployed_by_official:
        auth_status = await plan_ability_checked_in_func(
            ability=Ability.API_COLLECT_LIMITED_MUCH_MORE.value,
            authorization=f'Bearer {access_token}'
        )
    if not auth_status and deployed_by_official:
        raise schemas.error.CustomException("Document limit reached for the current plan", code=403)

    if document_create_request.category == DocumentCategory.WEBSITE:
        db_website_documents_count = crud.document.count_user_documents(
            db=db,
            user_id=user.id,
            filter_category=DocumentCategory.WEBSITE
        )
        if db_website_documents_count > 20 and deployed_by_official:
            auth_status = await plan_ability_checked_in_func(
                ability=Ability.COLLECT_LINK.value,
                authorization=f'Bearer {access_token}'
            )
            if not auth_status and deployed_by_official:
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
                authorization=f'Bearer {access_token}'
            )
            if not auth_status and deployed_by_official:
                raise schemas.error.CustomException("File document limit reached for the current plan", code=403)

    api_document_create_request = schemas.document.DocumentCreateRequest(
        **document_create_request.model_dump(mode='python'),
        from_plat='api',
    )
    db_document = await create_document_for_user(
        db=db,
        user=user,
        document_create_request=api_document_create_request,
        summary_timezone=user_timezone,
    )

    return schemas.document.DocumentCreateResponse(document_id=db_document.id)


@tp_router.post("/document/detail", response_model=schemas.document.DocumentDetailResponse)
async def get_document_detail(
    document_detail_request: schemas.document.DocumentDetailRequest,
    db: Session = Depends(get_db),
    user: models.user.User = Depends(get_current_user_with_api_key),
):
    return await get_document_detail_impl(
        document_detail_request=document_detail_request,
        db=db,
        user=user,
    )


@tp_router.post("/document/ai/summary", response_model=schemas.common.NormalResponse)
async def create_ai_summary(
    ai_summary_request: schemas.document.DocumentAiSummaryRequest,
    db: Session = Depends(get_db),
    user: models.user.User = Depends(get_current_user_with_api_key),
):
    return await create_ai_summary_impl(
        ai_summary_request=ai_summary_request,
        user=user,
        db=db,
    )


@tp_router.post("/document/embedding", response_model=schemas.common.NormalResponse)
async def create_document_embedding(
    embedding_request: schemas.document.DocumentEmbeddingRequest,
    db: Session = Depends(get_db),
    user: models.user.User = Depends(get_current_user_with_api_key),
):
    return await create_embedding_impl(
        embedding_request=embedding_request,
        user=user,
        db=db,
    )


@tp_router.post("/document/transcribe", response_model=schemas.common.NormalResponse)
async def transcribe_audio_document(
    transcribe_request: schemas.document.DocumentTranscribeRequest,
    db: Session = Depends(get_db),
    user: models.user.User = Depends(get_current_user_with_api_key),
):
    return await transcribe_audio_document_impl(
        transcribe_request=transcribe_request,
        user=user,
        db=db,
    )


@tp_router.post("/document/graph/generate", response_model=schemas.common.NormalResponse)
async def generate_document_graph(
    graph_generate_request: schemas.document.DocumentGraphGenerateRequest,
    db: Session = Depends(get_db),
    user: models.user.User = Depends(get_current_user_with_api_key),
):
    return await generate_document_graph_impl(
        graph_generate_request=graph_generate_request,
        user=user,
        db=db,
    )


@tp_router.post("/document/podcast/generate", response_model=schemas.common.NormalResponse)
async def generate_document_podcast(
    generate_podcast_request: schemas.document.GenerateDocumentPodcastRequest,
    db: Session = Depends(get_db),
    user: models.user.User = Depends(get_current_user_with_api_key),
):
    return await generate_document_podcast_impl(
        generate_podcast_request=generate_podcast_request,
        user=user,
        db=db,
    )


@tp_router.post("/document/month/summary", response_model=schemas.document.DocumentMonthSummaryResponse)
def get_document_month_summary(
    db: Session = Depends(get_db),
    user: models.user.User = Depends(get_current_user_with_api_key),
):
    return get_month_summary_impl(
        db=db,
        user=user,
    )


@tp_router.post("/document/note/create", response_model=schemas.common.NormalResponse)
def create_document_note(
    note_create_request: schemas.document.DocumentNoteCreateRequest,
    db: Session = Depends(get_db),
    user: models.user.User = Depends(get_current_user_with_api_key),
):
    crud.document.create_document_note(
        db=db,
        user_id=user.id,
        document_id=note_create_request.document_id,
        content=note_create_request.content,
    )
    db.commit()
    return schemas.common.SuccessResponse()


@tp_router.post(
    "/document/note/search",
    response_model=schemas.pagination.InifiniteScrollPagnition[schemas.document.DocumentNoteInfo],
)
def search_document_notes(
    search_note_request: schemas.document.SearchDocumentNoteRequest,
    db: Session = Depends(get_db),
    user: models.user.User = Depends(get_current_user_with_api_key),
):
    has_more = True
    next_start = None
    next_note = None
    notes = crud.document.search_all_document_notes_by_document_id(
        db=db,
        document_id=search_note_request.document_id,
        start=search_note_request.start,
        limit=search_note_request.limit,
        keyword=search_note_request.keyword,
    )
    if len(notes) < search_note_request.limit or len(notes) == 0:
        has_more = False
    if len(notes) == search_note_request.limit:
        next_note = crud.document.search_next_note_by_document_note(
            db=db,
            document_note=notes[-1],
            keyword=search_note_request.keyword,
        )
        has_more = next_note is not None
        next_start = next_note.id if next_note is not None else None
    total = crud.document.count_all_document_notes_by_document_id(
        db=db,
        document_id=search_note_request.document_id,
        keyword=search_note_request.keyword,
    )
    next_start = next_note.id if next_note is not None else None
    return schemas.pagination.InifiniteScrollPagnition(
        total=total,
        elements=notes,
        start=search_note_request.start,
        limit=search_note_request.limit,
        has_more=has_more,
        next_start=next_start,
    )


@tp_router.post("/document/note/delete", response_model=schemas.common.NormalResponse)
def delete_document_note(
    note_delete_request: schemas.document.DocumentNoteDeleteRequest,
    db: Session = Depends(get_db),
    user: models.user.User = Depends(get_current_user_with_api_key),
):
    crud.document.delete_document_notes_by_user_id_and_note_ids(
        db=db,
        user_id=user.id,
        note_ids=note_delete_request.document_note_ids,
    )
    db.commit()
    return schemas.common.SuccessResponse()


@tp_router.post(
    "/document/unread/search",
    response_model=schemas.pagination.InifiniteScrollPagnition[schemas.document.DocumentInfo],
)
async def search_unread_documents(
    search_unread_list_request: schemas.document.SearchUnreadListRequest,
    db: Session = Depends(get_db),
    user: models.user.User = Depends(get_current_user_with_api_key),
):
    return await search_user_unread_documents_impl(
        search_unread_list_request=search_unread_list_request,
        db=db,
        user=user,
    )


@tp_router.post(
    "/document/recent/search",
    response_model=schemas.pagination.InifiniteScrollPagnition[schemas.document.DocumentInfo],
)
async def search_recent_documents(
    search_recent_read_request: schemas.document.SearchRecentReadRequest,
    db: Session = Depends(get_db),
    user: models.user.User = Depends(get_current_user_with_api_key),
):
    return await recent_read_document_impl(
        search_recent_read_request=search_recent_read_request,
        db=db,
        user=user,
    )


@tp_router.post("/document/update", response_model=schemas.common.NormalResponse)
def update_document(
    document_update_request: schemas.document.DocumentUpdateRequest,
    db: Session = Depends(get_db),
    user: models.user.User = Depends(get_current_user_with_api_key),
):
    return update_document_impl(
        document_update_request=document_update_request,
        db=db,
        user=user,
    )


@tp_router.post("/document/markdown/transform", response_model=schemas.common.NormalResponse)
async def transform_document_markdown(
    transform_markdown_request: schemas.document.DocumentMarkdownConvertRequest,
    db: Session = Depends(get_db),
    user: models.user.User = Depends(get_current_user_with_api_key),
):
    return await transform_markdown_impl(
        transform_markdown_request=transform_markdown_request,
        user=user,
        db=db,
    )


@tp_router.post("/document/delete", response_model=schemas.common.NormalResponse)
async def delete_document(
    documents_delete_request: schemas.document.DocumentDeleteRequest,
    db: Session = Depends(get_db),
    user: models.user.User = Depends(get_current_user_with_api_key),
):
    return await delete_document_impl(
        documents_delete_request=documents_delete_request,
        db=db,
        user=user,
    )


@tp_router.post(
    "/document/star/search",
    response_model=schemas.pagination.InifiniteScrollPagnition[schemas.document.DocumentInfo],
)
async def search_star_documents(
    search_my_star_documents_request: schemas.document.SearchMyStarDocumentsRequest,
    db: Session = Depends(get_db),
    user: models.user.User = Depends(get_current_user_with_api_key),
):
    return await search_my_star_documents_impl(
        search_my_star_documents_request=search_my_star_documents_request,
        db=db,
        user=user,
    )


@tp_router.post(
    "/document/search/mine",
    response_model=schemas.pagination.InifiniteScrollPagnition[schemas.document.DocumentInfo],
)
async def search_mine_documents(
    search_all_my_document_request: schemas.document.SearchAllMyDocumentsRequest,
    db: Session = Depends(get_db),
    user: models.user.User = Depends(get_current_user_with_api_key),
):
    return await search_all_mine_documents_impl(
        search_all_my_document_request=search_all_my_document_request,
        db=db,
        user=user,
    )


@tp_router.post(
    "/document/vector/search",
    response_model=schemas.document.VectorSearchResponse,
)
def search_document_vector(
    vector_search_request: schemas.document.VectorSearchRequest,
    db: Session = Depends(get_db),
    user: models.user.User = Depends(get_current_user_with_api_key),
):
    return search_knowledge_vector_impl(
        vector_search_request=vector_search_request,
        db=db,
        user=user,
    )


@tp_router.post("/graph/document", response_model=schemas.graph.GraphResponse)
def document_graph(
    document_graph_request: schemas.graph.DocumentGraphRequest,
    user: models.user.User = Depends(get_current_user_with_api_key),
):
    return document_graph_impl(
        document_graph_request=document_graph_request,
        user=user,
    )


@tp_router.post("/graph/section", response_model=schemas.graph.GraphResponse)
def section_graph(
    section_graph_request: schemas.graph.SectionGraphRequest,
    db: Session = Depends(get_db),
    user: models.user.User = Depends(get_current_user_with_api_key),
):
    return section_graph_impl(
        section_graph_request=section_graph_request,
        user=user,
        db=db,
    )


@tp_router.post("/graph/search", response_model=schemas.graph.GraphResponse)
def search_graph(
    user: models.user.User = Depends(get_current_user_with_api_key),
):
    return graph_impl(user=user)
