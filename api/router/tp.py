# 第三方接口

# 当使用api key的时候，调用这边的接口组

import schemas
import crud
from celery import chain, group
from datetime import datetime, timezone
from common.celery.app import start_process_document, start_process_section
from common.dependencies import get_db, get_current_user_with_api_key
from common.common import get_user_remote_file_system
from sqlalchemy.orm import Session
from fastapi import APIRouter, Depends, File, UploadFile, Form
from enums.document import DocumentCategory, UserDocumentAuthority
from enums.section import UserSectionAuthority, UserSectionRole, SectionDocumentIntegration

tp_router = APIRouter()

@tp_router.post('/file/upload', response_model=schemas.common.NormalResponse)
async def upload_file_system(
    file: UploadFile = File(...),
    file_path: str = Form(...),
    content_type: str = Form(...),
    db: Session = Depends(get_db),
    user: schemas.user.PrivateUserInfo = Depends(get_current_user_with_api_key)
):
    if user.default_user_file_system is None:
        raise schemas.error.CustomException(message="The user have no default file system")
    user_file_system = crud.file_system.get_user_file_system_by_id(
        db=db,
        user_file_system_id=user.default_user_file_system
    )
    if user_file_system is None:
        raise schemas.error.CustomException(message="There are something wrong with the user file system")
    
    content = await file.read()
    
    remote_file_service = await get_user_remote_file_system(
        user.id
    )
    await remote_file_service.init_client_by_user_file_system_id(
        user_file_system_id=user.default_user_file_system
    )
    await remote_file_service.upload_raw_content_to_path(
        file_path=file_path,
        content=content,
        content_type=content_type
    )
    return schemas.common.SuccessResponse()

@tp_router.post('/section/create', response_model=schemas.section.SectionCreateResponse)
async def create_section(
    section_create_request: schemas.section.SectionCreateRequest,
    db: Session = Depends(get_db),
    user: schemas.user.PrivateUserInfo = Depends(get_current_user_with_api_key)
):
    db_section = crud.section.create_section(
        db=db, 
        creator_id=user.id,
        cover=section_create_request.cover,
        title=section_create_request.title, 
        description=section_create_request.description
    )
    if section_create_request.labels:
        crud.section.create_section_labels(
            db=db, 
            section_id=db_section.id, 
            label_ids=section_create_request.labels
        )
    crud.section.create_section_user(
        db=db,
        section_id=db_section.id,
        user_id=user.id,
        authority=UserSectionAuthority.FULL_ACCESS,
        role=UserSectionRole.CREATOR
    )
    db.commit()
    return schemas.section.SectionCreateResponse(id=db_section.id)

@tp_router.post('/section/label/create', response_model=schemas.section.CreateLabelResponse)
async def add_label(
    label_add_request: schemas.section.LabelAddRequest,
    db: Session = Depends(get_db), 
    user: schemas.user.PrivateUserInfo = Depends(get_current_user_with_api_key)
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

@tp_router.post('/section/mine/all', response_model=schemas.section.AllMySectionsResponse)
async def get_all_mine_sections(
    db: Session = Depends(get_db),
    user: schemas.user.PrivateUserInfo = Depends(get_current_user_with_api_key)
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

@tp_router.post("/document/label/list", response_model=schemas.document.LabelListResponse)
async def list_label(
    db: Session = Depends(get_db), 
    user: schemas.user.PrivateUserInfo = Depends(get_current_user_with_api_key)
):
    db_labels = crud.document.get_user_labels_by_user_id(
        db=db, 
        user_id=user.id
    )
    labels = [
        schemas.document.Label.model_validate(db_label)
        for db_label in db_labels
    ]
    return schemas.document.LabelListResponse(data=labels)

@tp_router.post("/document/label/create", response_model=schemas.document.CreateLabelResponse)
async def create_document_label(
    label_add_request: schemas.document.LabelAddRequest,
    db: Session = Depends(get_db),
    user: schemas.user.PrivateUserInfo = Depends(get_current_user_with_api_key)
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
                       
@tp_router.post("/document/create", response_model=schemas.document.DocumentCreateResponse)
async def create_document(
    document_create_request: schemas.document.DocumentCreateRequest, 
    db: Session = Depends(get_db), 
    user: schemas.user.PrivateUserInfo = Depends(get_current_user_with_api_key)
):
    now = datetime.now(timezone.utc)
    if document_create_request.category == DocumentCategory.WEBSITE:
        if document_create_request.url is None:
            raise Exception('The url is required when the document category is website')
        db_document = crud.document.create_base_document(
            db=db,
            creator_id=user.id,
            title='Website Analysing...',
            description='Website Analysing...',
            category=document_create_request.category,
            from_plat=document_create_request.from_plat
        )
        crud.document.create_website_document(
            db=db, 
            url=document_create_request.url, 
            document_id=db_document.id
        )
    elif document_create_request.category == DocumentCategory.FILE:
        if document_create_request.file_name is None:
            raise Exception('The file name is required when the document category is file')
        db_document = crud.document.create_base_document(
            db=db,
            creator_id=user.id,
            category=document_create_request.category,
            from_plat=document_create_request.from_plat,
            title=f'File document analysing...',
            description=f'File document analysing...'
        )
        crud.document.create_file_document(
            db=db,
            document_id=db_document.id,
            file_name=document_create_request.file_name
        )
    elif document_create_request.category == DocumentCategory.QUICK_NOTE:
        if document_create_request.content is None:
            raise Exception('The content is required when the document category is quick note')
        db_document = crud.document.create_base_document(
            db=db,
            creator_id=user.id,
            category=document_create_request.category,
            from_plat=document_create_request.from_plat,
            title=f'Quick Note saved at {now}',
            description=f'Quick Note saved at {now}'
        )
        crud.document.create_quick_note_document(
            db=db,
            document_id=db_document.id,
            content=document_create_request.content
        )
    else:
        raise Exception('Invalid document category')
    if len(document_create_request.labels) > 0:
        crud.document.create_document_labels(
            db=db, 
            document_id=db_document.id, 
            label_ids=document_create_request.labels
        )
    crud.document.create_user_document(
        db=db, 
        user_id=user.id, 
        document_id=db_document.id, 
        authority=UserDocumentAuthority.OWNER
    )
    # 查看是否存在当日专栏，并且绑定当前文档到今日专栏
    db_today_section = crud.section.get_section_by_user_and_date(
        db=db, 
        user_id=user.id,
        date=now.date()
    )
    if db_today_section is None:
        db_today_section = crud.section.create_section(
            db=db, 
            creator_id=user.id,
            title=f'{now.date().isoformat()} Summary',
            description=f"This document is the summary of all documents on {now.date().isoformat()}."
        )
        crud.section.create_section_user(
            db=db,
            section_id=db_today_section.id,
            user_id=user.id,
            role=UserSectionRole.CREATOR,
            authority=UserSectionAuthority.FULL_ACCESS
        )
        crud.section.create_date_section(
            db=db,
            section_id=db_today_section.id,
            date=now.date()
        )
    document_create_request.sections.append(db_today_section.id)
    for section_id in document_create_request.sections:
        crud.section.create_or_update_section_document(
            db=db,
            document_id=db_document.id,
            section_id=section_id,
            status=SectionDocumentIntegration.WAIT_TO
        )
    if db_document.category != DocumentCategory.QUICK_NOTE:
        crud.task.create_document_convert_task(
            db=db,
            user_id=user.id,
            document_id=db_document.id
        )
    db.commit()
    
    # 开始后台处理
    # 获取所有关联的 section（此时已经写入 WAIT_TO 状态）
    db_sections = crud.section.get_sections_by_document_id(
        db=db,
        document_id=db_document.id
    )
    # 构造每个 Section 的 Celery 任务
    section_process_tasks = group(
        start_process_section.si(
            section_id=sec.id,
            user_id=user.id,
            auto_podcast=sec.auto_podcast
        )
        for sec in db_sections
    )
    
    background_tasks = chain(
        start_process_document.si(
            document_id=db_document.id, 
            user_id=user.id, 
            auto_summary=document_create_request.auto_summary, 
            auto_podcast=document_create_request.auto_podcast,
            override=schemas.task.DocumentOverrideProperty(
                title=document_create_request.title, 
                description=document_create_request.description, 
                cover=document_create_request.cover
            )
        ),
        section_process_tasks
    )
    background_tasks.apply_async()
    
    return schemas.document.DocumentCreateResponse(document_id=db_document.id)