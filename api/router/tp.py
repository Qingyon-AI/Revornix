# 第三方接口

# 当使用api key的时候，调用这边的接口组

import schemas
import crud
from fastapi.encoders import jsonable_encoder
from celery import group, chain
from datetime import datetime, timezone
from common.celery.app import update_ai_summary, add_embedding, init_website_document_info, update_sections, init_file_document_info
from common.dependencies import get_db, get_current_user_with_api_key
from common.common import get_user_remote_file_system
from sqlalchemy.orm import Session
from fastapi import APIRouter, Depends, File, UploadFile, Form
from enums.document import DocumentCategory

tp_router = APIRouter()

@tp_router.post('/file/upload', response_model=schemas.common.NormalResponse)
async def upload_file_system(file: UploadFile = File(...),
                             file_path: str = Form(...),
                             content_type: str = Form(...),
                             db: Session = Depends(get_db),
                             user: schemas.user.PrivateUserInfo = Depends(get_current_user_with_api_key)):
    content = await file.read()
    user_file_system = crud.file_system.get_user_file_system_by_id(db=db,
                                                                   user_file_system_id=user.default_user_file_system)
    if user_file_system is None:
        raise schemas.error.CustomException(code=404, message="User File System not found")
    remote_file_service = await get_user_remote_file_system(user.id)
    await remote_file_service.init_client_by_user_file_system_id(user_file_system_id=user.default_user_file_system)
    await remote_file_service.upload_raw_content_to_path(file_path=file_path,
                                                         content=content,
                                                         content_type=content_type)
    return schemas.common.SuccessResponse()

@tp_router.post('/section/create', response_model=schemas.section.SectionCreateResponse)
async def create_section(section_create_request: schemas.section.SectionCreateRequest,
                         db: Session = Depends(get_db),
                         user: schemas.user.PrivateUserInfo = Depends(get_current_user_with_api_key)):
    db_section = crud.section.create_section(db=db, 
                                             creator_id=user.id,
                                             cover=section_create_request.cover,
                                             title=section_create_request.title, 
                                             description=section_create_request.description,
                                             public=section_create_request.public)
    if section_create_request.labels:
            crud.section.bind_labels_to_section(db=db, 
                                                section_id=db_section.id, 
                                                label_ids=section_create_request.labels)
    db_user_section = crud.section.bind_section_to_user(db=db,
                                                        section_id=db_section.id,
                                                        user_id=user.id,
                                                        authority=0)
    db.commit()
    return schemas.section.SectionCreateResponse(id=db_section.id)

@tp_router.post('/section/label/create', response_model=schemas.section.CreateLabelResponse)
async def add_label(label_add_request: schemas.section.LabelAddRequest,
                    db: Session = Depends(get_db), 
                    user: schemas.user.PrivateUserInfo = Depends(get_current_user_with_api_key)):
    db_label = crud.section.create_label(db=db, 
                                         name=label_add_request.name, 
                                         user_id=user.id)
    db.commit()
    return schemas.section.CreateLabelResponse(id=db_label.id, name=db_label.name)

@tp_router.post('/section/mine/all', response_model=schemas.section.AllMySectionsResponse)
async def get_all_mine_sections(db: Session = Depends(get_db),
                                user: schemas.user.PrivateUserInfo = Depends(get_current_user_with_api_key)):
    db_sections = crud.section.get_all_my_sections(db=db, 
                                                   user_id=user.id)
    return schemas.section.AllMySectionsResponse(data=db_sections)

@tp_router.post("/document/label/list", response_model=schemas.document.LabelListResponse)
async def list_label(db: Session = Depends(get_db), 
                     user: schemas.user.PrivateUserInfo = Depends(get_current_user_with_api_key)):
    labels = crud.document.get_user_labels_by_user_id(db=db, 
                                                      user_id=user.id)
    labels = jsonable_encoder(labels)
    return schemas.document.LabelListResponse(data=labels)

@tp_router.post("/document/label/create", response_model=schemas.document.CreateLabelResponse)
async def create_document_label(label_add_request: schemas.document.LabelAddRequest,
                                db: Session = Depends(get_db),
                                user: schemas.user.PrivateUserInfo = Depends(get_current_user_with_api_key)):
    db_label = crud.document.create_label(db=db, 
                                          name=label_add_request.name, 
                                          user_id=user.id)
    db.commit()
    return schemas.document.CreateLabelResponse(id=db_label.id, name=db_label.name)
                       
@tp_router.post("/document/create", response_model=schemas.document.DocumentCreateResponse)
async def create_document(document_create_request: schemas.document.DocumentCreateRequest, 
                          db: Session = Depends(get_db), 
                          user: schemas.user.PrivateUserInfo = Depends(get_current_user_with_api_key)):
    now = datetime.now(timezone.utc)
    if document_create_request.category == DocumentCategory.WEBSITE:
        db_document = crud.document.create_base_document(
            db=db,
            creator_id=user.id,
            title='Website Analysing...',
            description='Website Analysing...',
            category=document_create_request.category,
            from_plat=document_create_request.from_plat
        )
        if document_create_request.labels is not None:
            crud.document.bind_labels_to_document(db=db, 
                                                  document_id=db_document.id, 
                                                  label_ids=document_create_request.labels)
        crud.document.bind_document_to_user(db=db, 
                                            user_id=user.id, 
                                            document_id=db_document.id, 
                                            authority="owner")
        db_website_document = crud.document.create_website_document(db=db, 
                                                                    url=document_create_request.url, 
                                                                    document_id=db_document.id)
        # 查看是否存在当日专栏，并且绑定当前文档到今日专栏
        db_today_section = crud.section.get_section_by_user_and_date(db=db, 
                                                                     user_id=user.id,
                                                                     date=now.date().isoformat())
        if db_today_section is None:
            db_today_section = crud.section.create_section(db=db, 
                                                           creator_id=user.id,
                                                           title=f'{now.date().isoformat()} Summary',
                                                           public=False,
                                                           description=f'This document is the summary of all documents on{now.date()}')
            crud.section.bind_section_to_user(db=db,
                                              section_id=db_today_section.id,
                                              user_id=user.id,
                                              authority=0)
            crud.section.bind_section_to_date_by_date_and_section_id_and_user_id(db=db,
                                                                                 section_id=db_today_section.id,
                                                                                 date=now.date().isoformat())
        document_create_request.sections.append(db_today_section.id)
        for section_id in document_create_request.sections:
            db_section_documents = crud.section.bind_document_to_section(db=db,
                                                                         document_id=db_document.id,
                                                                         section_id=section_id)
        crud.task.create_document_transform_task(db=db,
                                                 user_id=user.id,
                                                 document_id=db_document.id)
        db.commit()
        first_task = init_website_document_info.si(db_document.id, user.id)
        second_tasks = [add_embedding.si(db_document.id, user.id), update_sections.si(document_create_request.sections, db_document.id, user.id)]
        if document_create_request.auto_summary:
            second_tasks.append(update_ai_summary.si(db_document.id, user.id))
        task_chain = chain(first_task, group(second_tasks))
        task_chain.apply_async()
    elif document_create_request.category == DocumentCategory.FILE:
        db_document = crud.document.create_base_document(
            db=db,
            creator_id=user.id,
            category=document_create_request.category,
            from_plat=document_create_request.from_plat,
            title=f'File document analysing...',
            description=f'File document analysing...'
        )
        db_file_document = crud.document.create_file_document(db=db,
                                                              document_id=db_document.id,
                                                              file_name=document_create_request.file_name)
        crud.task.create_document_transform_task(db=db,
                                                 user_id=user.id,
                                                 document_id=db_document.id)
        if document_create_request.labels:
            crud.document.bind_labels_to_document(db=db, 
                                                  document_id=db_document.id, 
                                                  label_ids=document_create_request.labels)
        crud.document.bind_document_to_user(db=db, 
                                            user_id=user.id, 
                                            document_id=db_document.id, 
                                            authority="owner")
        # 查看是否存在当日专栏，并且绑定当前文档到今日专栏
        db_today_section = crud.section.get_section_by_user_and_date(db=db, 
                                                                     user_id=user.id,
                                                                     date=now.date().isoformat())
        if db_today_section is None:
            db_today_section = crud.section.create_section(db=db, 
                                                           creator_id=user.id,
                                                           title=f'{now.date()} Summary',
                                                           public=False,
                                                           description=f'This document is the summary of all documents on {now.date().isoformat()}.')
            crud.section.bind_section_to_user(db=db,
                                              section_id=db_today_section.id,
                                              user_id=user.id,
                                              authority=0)
            crud.section.bind_section_to_date_by_date_and_section_id_and_user_id(db=db,
                                                                                 section_id=db_today_section.id,
                                                                                 date=now.date().isoformat())
        document_create_request.sections.append(db_today_section.id)
        for section_id in document_create_request.sections:
            db_section_documents = crud.section.bind_document_to_section(db=db,
                                                                         document_id=db_document.id,
                                                                         section_id=section_id)
        crud.section.bind_document_to_section(db=db,
                                              section_id=db_today_section.id,
                                              document_id=db_document.id,
                                              status=0)
        db.commit()
        first_task = init_file_document_info.si(db_document.id, user.id)
        second_tasks = [add_embedding.si(db_document.id, user.id), update_sections.si(document_create_request.sections, db_document.id, user.id)]
        if document_create_request.auto_summary:
            second_tasks.append(update_ai_summary.si(db_document.id, user.id))
        task_chain = chain(first_task, group(second_tasks))
        task_chain.apply_async()
    elif document_create_request.category == DocumentCategory.QUICK_NOTE:
        db_document = crud.document.create_base_document(
            db=db,
            creator_id=user.id,
            category=document_create_request.category,
            from_plat=document_create_request.from_plat,
            title=f'Quick Note saved at {now}',
            description=f'Quick Note saved at {now}'
        )
        db_quick_note_document = crud.document.create_quick_note_document(db=db,
                                                                          document_id=db_document.id,
                                                                          content=document_create_request.content)
        if document_create_request.labels:
            crud.document.bind_labels_to_document(db=db, 
                                                  document_id=db_document.id, 
                                                  label_ids=document_create_request.labels)
        crud.document.bind_document_to_user(db=db, 
                                            user_id=user.id, 
                                            document_id=db_document.id, 
                                            authority="owner")
        # 查看是否存在当日专栏，并且绑定当前文档到今日专栏
        db_today_section = crud.section.get_section_by_user_and_date(db=db, 
                                                                     user_id=user.id,
                                                                     date=now.date().isoformat())
        if db_today_section is None:
            db_today_section = crud.section.create_section(db=db, 
                                                           creator_id=user.id,
                                                           title=f'{now.date().isoformat()} Summary',
                                                           public=False,
                                                           description=f'This document is the summary of all documents on {now.date().isoformat()}.')
            crud.section.bind_section_to_user(db=db,
                                              section_id=db_today_section.id,
                                              user_id=user.id,
                                              authority=0)
            crud.section.bind_section_to_date_by_date_and_section_id_and_user_id(db=db,
                                                                                 section_id=db_today_section.id,
                                                                                 date=now.date().isoformat())
        document_create_request.sections.append(db_today_section.id)
        for section_id in document_create_request.sections:
            db_section_documents = crud.section.bind_document_to_section(db=db,
                                                                         document_id=db_document.id,
                                                                         section_id=section_id)
        crud.section.bind_document_to_section(db=db,
                                              section_id=db_today_section.id,
                                              document_id=db_document.id,
                                              status=0)
        db.commit()
        first_task = [add_embedding.si(db_document.id, user.id), update_sections.si(document_create_request.sections, db_document.id, user.id)]
        second_tasks = []
        if document_create_request.auto_summary:
            second_tasks.append(update_ai_summary.si(db_document.id, user.id))
        task_chain = chain(group(first_task), group(second_tasks))
        task_chain.apply_async()
    return schemas.document.DocumentCreateResponse(document_id=db_document.id)