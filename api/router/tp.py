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
from router.document_interaction_manage import delete_document as delete_document_impl
from router.document_query import (
    get_document_detail as get_document_detail_impl,
    search_knowledge_vector as search_knowledge_vector_impl,
    search_all_mine_documents as search_all_mine_documents_impl,
)
from router.section import (
    create_section as create_section_impl,
    delete_section as delete_section_impl,
    update_section as update_section_impl,
)
from router.section_detail_query import (
    get_section_detail as get_section_detail_impl,
    section_document_request as section_document_request_impl,
)
from router.section_publish_manage import (
    section_publish_get_request as section_publish_get_request_impl,
    section_publish_request as section_publish_request_impl,
    section_republish as section_republish_impl,
)
from router.section_search_query import search_mine_sections as search_mine_sections_impl

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
