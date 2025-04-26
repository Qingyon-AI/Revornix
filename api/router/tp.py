# 第三方接口

# 当使用api key的时候，调用这边的接口组

import schemas
import crud
from fastapi.encoders import jsonable_encoder
from celery import group, chain
from datetime import datetime, timezone
from common.celery.app import update_ai_summary, add_embedding, update_website_document_markdown_with_jina, init_website_document_info, update_sections, update_file_document_markdown_with_mineru
from common.dependencies import get_db, get_current_user_with_api_key
from common.notification import union_send_notification
from sqlalchemy.orm import Session
from fastapi import APIRouter, Depends

tp_router = APIRouter()

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

@tp_router.post("/document/label/create", response_model=schemas.document.DocumentCreateResponse)
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
    if document_create_request.category == 1:
        db_document = crud.document.create_base_document(
            db=db,
            creator_id=user.id,
            title='加载中...',
            description='加载中...',
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
                                                                     date=now.date())
        if db_today_section is None:
            db_today_section = crud.section.create_section(db=db, 
                                                           creator_id=user.id,
                                                           title=f'{now.date()}总结',
                                                           public=False,
                                                           description=f'这篇文档是{now.date()}的所有文档的总结')
            crud.section.bind_section_to_user(db=db,
                                              section_id=db_today_section.id,
                                              user_id=user.id,
                                              authority=0)
            crud.section.bind_section_to_date_by_date_and_section_id_and_user_id(db=db,
                                                                                 section_id=db_today_section.id,
                                                                                 date=now.date())
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
        second_task = update_website_document_markdown_with_jina.si(db_document.id, user.id)
        third_tasks = [add_embedding.si(db_document.id, user.id), update_sections.si(document_create_request.sections, db_document.id, user.id)]
        if document_create_request.auto_summary:
            third_tasks.append(update_ai_summary.si(db_document.id, user.id))
        task_chain = chain(first_task, second_task, group(third_tasks))
        task_chain.apply_async()
    elif document_create_request.category == 0:
        db_document = crud.document.create_base_document(
            db=db,
            creator_id=user.id,
            category=document_create_request.category,
            from_plat=document_create_request.from_plat,
            title=f'文件文档{now}',
            description=f'文件文档{now}'
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
                                                                     date=now.date())
        if db_today_section is None:
            db_today_section = crud.section.create_section(db=db, 
                                                           creator_id=user.id,
                                                           title=f'{now.date()}总结',
                                                           public=False,
                                                           description=f'这篇文档是{now.date()}的所有文档的总结')
            crud.section.bind_section_to_user(db=db,
                                              section_id=db_today_section.id,
                                              user_id=user.id,
                                              authority=0)
            crud.section.bind_section_to_date_by_date_and_section_id_and_user_id(db=db,
                                                                                 section_id=db_today_section.id,
                                                                                 date=now.date())
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
        first_task = update_file_document_markdown_with_mineru.si(db_document.id, user.id)
        second_tasks = [add_embedding.si(db_document.id, user.id), update_sections.si(document_create_request.sections, db_document.id, user.id)]
        if document_create_request.auto_summary:
            second_tasks.append(update_ai_summary.si(db_document.id, user.id))
        task_chain = chain(first_task, group(second_tasks))
        task_chain.apply_async()
    elif document_create_request.category == 2:
        db_document = crud.document.create_base_document(
            db=db,
            creator_id=user.id,
            category=document_create_request.category,
            from_plat=document_create_request.from_plat,
            title=f'速记文档{now}',
            description=f'速记文档{now}'
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
                                                                     date=now.date())
        if db_today_section is None:
            db_today_section = crud.section.create_section(db=db, 
                                                           creator_id=user.id,
                                                           title=f'{now.date()}总结',
                                                           public=False,
                                                           description=f'这篇文档是{now.date()}的所有文档的总结')
            crud.section.bind_section_to_user(db=db,
                                              section_id=db_today_section.id,
                                              user_id=user.id,
                                              authority=0)
            crud.section.bind_section_to_date_by_date_and_section_id_and_user_id(db=db,
                                                                                 section_id=db_today_section.id,
                                                                                 date=now.date())
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

@tp_router.post('/notification/create', response_model=schemas.common.NormalResponse)
async def create_notification(create_notification_request: schemas.notification.CreateNotificationRequest, 
                              user: schemas.user.PrivateUserInfo = Depends(get_current_user_with_api_key)):
    await union_send_notification(user_id=user.id,
                                  title=create_notification_request.title,
                                  content=create_notification_request.content,
                                  link=create_notification_request.link,
                                  notification_type=create_notification_request.notification_type)
    return schemas.common.SuccessResponse()