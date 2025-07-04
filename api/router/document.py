import crud
import models
import uuid
import schemas
from celery import chain, group
from datetime import datetime, timezone
from schemas.common import SuccessResponse
from sqlalchemy.orm import Session
from fastapi import APIRouter, Depends, Request
from fastapi.encoders import jsonable_encoder
from common.ai import summary_document
from common.dependencies import get_db, get_authorization_header
from common.vector import milvus_client, process_query, hybrid_search
from common.dependencies import get_db, get_current_user
from common.logger import log_exception, exception_logger
from common.file import RemoteFileService
from common.celery.app import update_ai_summary, add_embedding, init_website_document_info, update_sections, init_file_document_info
from engine.markitdown import MarkitdownEngine
from engine.jina import JinaEngine
from engine.mineru import MineruEngine

document_router = APIRouter()
    
@document_router.post('/note/create', response_model=schemas.common.NormalResponse)
async def create_note(note_create_request: schemas.document.DocumentNoteCreateRequest,
                      user: schemas.user.PrivateUserInfo = Depends(get_current_user),
                      db: Session = Depends(get_db)):
    crud.document.create_document_note(db=db,
                                       user_id=user.id,
                                       document_id=note_create_request.document_id,
                                       content=note_create_request.content)
    db.commit()
    return schemas.common.SuccessResponse()

@document_router.post('/note/delete', response_model=schemas.common.NormalResponse)
async def delete_note(note_delete_request: schemas.document.DocumentNoteDeleteRequest,
                      user: schemas.user.PrivateUserInfo = Depends(get_current_user),
                      db: Session = Depends(get_db)):
    crud.document.delete_document_notes_by_user_id_and_note_ids(db=db,
                                                                user_id=user.id,
                                                                note_ids=note_delete_request.document_note_ids)
    db.commit()
    return schemas.common.SuccessResponse()

@document_router.post('/note/search', response_model=schemas.pagination.InifiniteScrollPagnition[schemas.document.DocumentNoteInfo])
async def update_note(search_note_request: schemas.document.SearchDocumentNoteRequest,
                      user: schemas.user.PrivateUserInfo = Depends(get_current_user),
                      db: Session = Depends(get_db)):
    has_more = True
    next_start = None
    notes = crud.document.search_all_document_notes_by_document_id(db=db,
                                                                   document_id=search_note_request.document_id,
                                                                   start=search_note_request.start,
                                                                   limit=search_note_request.limit,
                                                                   keyword=search_note_request.keyword)
    if len(notes) < search_note_request.limit or len(notes) == 0:
        has_more = False
    if len(notes) == search_note_request.limit:
        next_note = crud.document.search_next_note_by_document_note(db=db, 
                                                                    document_note=notes[-1],
                                                                    keyword=search_note_request.keyword)
        has_more = next_note is not None
        next_start = next_note.id if has_more else None
    total = crud.document.count_all_document_notes_by_document_id(db=db,
                                                                  document_id=search_note_request.document_id,
                                                                  keyword=search_note_request.keyword)
    return schemas.pagination.InifiniteScrollPagnition(
        total=total,
        elements=notes,
        start=search_note_request.start,
        limit=search_note_request.limit,
        has_more=has_more,
        next_start=next_start
    )
    
@document_router.post('/ai/summary', response_model=schemas.common.NormalResponse)
async def create_ai_summary(ai_summary_request: schemas.document.DocumentAiSummaryRequest,
                            user: models.user.User = Depends(get_current_user),
                            db: Session = Depends(get_db),
                            authorization: str = Depends(get_authorization_header)):
    db_document = crud.document.get_document_by_document_id(db=db,
                                                            document_id=ai_summary_request.document_id)
    remote_file_service =  RemoteFileService(authorization=authorization)
    if db_document is None:
        raise Exception('The document you want to transform is not found')
    if db_document.category == 1:
        db_website_document = crud.document.get_website_document_by_document_id(db=db,
                                                                                document_id=ai_summary_request.document_id)
        markdown_content = await remote_file_service.get_object_content(file_path=db_website_document.md_file_name)
    if db_document.category == 0:
        db_file_document = crud.document.get_file_document_by_document_id(db=db,
                                                                          document_id=ai_summary_request.document_id)
        markdown_content = await remote_file_service.get_object_content(file_path=db_file_document.md_file_name)
    if db_document.category == 2:
        db_quick_note_document = crud.document.get_quick_note_document_by_document_id(db=db,
                                                                                      document_id=ai_summary_request.document_id)
        markdown_content = db_quick_note_document.content
    model_id = crud.user.get_user_by_id(db=db, user_id=user.id).default_document_reader_model_id
    ai_summary_result = summary_document(user_id=user.id, model_id=model_id, markdown_content=markdown_content)
    crud.document.update_document_by_document_id(db=db,
                                                 document_id=ai_summary_request.document_id,
                                                 title=ai_summary_result.get('title'),
                                                 description=ai_summary_result.get('description'),
                                                 ai_summary=ai_summary_result.get('summary'))
    db.commit()
    await remote_file_service.close_client()
    return schemas.common.SuccessResponse()

@document_router.post('/markdown/transform', response_model=schemas.common.NormalResponse)
async def transform_markdown(request: Request,
                             transform_markdown_request: schemas.document.DocumentMarkdownTransformRequest,
                             user: models.user.User = Depends(get_current_user),
                             db: Session = Depends(get_db),
                             authorization: str = Depends(get_authorization_header)):
    remote_file_service =  RemoteFileService(authorization=authorization)
    db_user = crud.user.get_user_by_id(db=db, 
                                       user_id=user.id)
    db_document = crud.document.get_document_by_document_id(db=db,
                                                            document_id=transform_markdown_request.document_id)
    db_transform_task = crud.task.get_document_transform_task_by_document_id(db=db,
                                                                             document_id=transform_markdown_request.document_id)
    if db_document is None:
        raise Exception('The document you want to transform is not found')
    if db_transform_task.status == 1:
        raise Exception('The document is being transformed, please wait')
    if db_document.category == 1:
        db_website_document = crud.document.get_website_document_by_document_id(db=db,
                                                                                document_id=transform_markdown_request.document_id)
        if db_website_document is None:
            raise Exception('The website info of the document you want to transform is not found, please connect the administrator')
        try:
            db_transform_task.status = 1
            db.commit()
            db.refresh(db_document)
            default_website_document_parse_engine_id = db_user.default_website_document_parse_engine_id
            if default_website_document_parse_engine_id is None:
                raise Exception("User does not have default website document parse engine")
            website_extractor = crud.engine.get_engine_by_id(db=db, 
                                                             id=default_website_document_parse_engine_id)
            if website_extractor.name.lower() == "markitdown":
                engine = MarkitdownEngine(user_id=user.id)
                web_info = await engine.analyse_website(url=db_website_document.url)
            if website_extractor.name.lower() == "jina":
                engine = JinaEngine(user_id=user.id)
                web_info = await engine.analyse_website(url=db_website_document.url)
            if website_extractor.name.lower() == "mineru":
                engine = MineruEngine(user_id=user.id)
                web_info = await engine.analyse_website(url=db_website_document.url)
            markdown_content = web_info.content
            md_file_name = f"markdown/{uuid.uuid4().hex}.md"
            await remote_file_service.put_object_with_raw_data(remote_file_path=md_file_name,
                                                               raw_data=markdown_content)
            crud.document.update_website_document_by_website_document_id(db=db,
                                                                         website_document_id=db_website_document.id,
                                                                         md_file_name=md_file_name)
            db_transform_task.status = 2
        except Exception as e:
            exception_logger.error(f"记载报错，涉及请求{request}，错误{e}")
            log_exception()
            db.rollback()
            db_transform_task.status = 3
    if db_document.category == 0:
        db_file_document = crud.document.get_file_document_by_document_id(db=db,
                                                                          document_id=transform_markdown_request.document_id)
        if db_file_document is None:
            raise Exception('The file info of the document you want to transform is not found, please connect the administrator')
        transform_task = crud.task.get_document_transform_task_by_document_id(db=db,
                                                                              document_id=transform_markdown_request.document_id)
        if transform_task is None:
            crud.task.create_document_transform_task(db=db,
                                                     user_id=user.id,
                                                     document_id=transform_markdown_request.document_id)
        else:
            if transform_task.status == 0:
                raise Exception('The transform task is already in pending, please wait for a while')
            if transform_task.status == 1:
                raise Exception('The transform task is already running, please wait for a while')
            if transform_task.status == 2:
                raise Exception('The transform task is already finished, please refresh the page')
            if transform_task.status == 3:
                transform_task.status = 1
                db.commit()
                db.refresh(transform_task)
                first_task = init_file_document_info.si(db_document.id, user.id)
                task_chain = chain(first_task)
                task_chain.apply_async()
    db.commit()
    await remote_file_service.close_client()
    return schemas.common.SuccessResponse()
        
@document_router.post('/month/summary', response_model=schemas.document.DocumentMonthSummaryResponse)
async def get_month_summary(db: Session = Depends(get_db), 
                            user: models.user.User = Depends(get_current_user)):
    documents = crud.document.get_document_summary_by_user_id(db=db, 
                                                              user_id=user.id)
    # 格式化数据
    summary_items = [schemas.document.SummaryItem(date=row.date, total=row.total) for row in documents]
    return schemas.document.DocumentMonthSummaryResponse(data=summary_items)

@document_router.post('/create', response_model=schemas.document.DocumentCreateResponse)
async def create_document(document_create_request: schemas.document.DocumentCreateRequest,  
                          db: Session = Depends(get_db), 
                          user: schemas.user.PrivateUserInfo = Depends(get_current_user)):
    now = datetime.now(timezone.utc)
    if document_create_request.category == 1:
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
                                                                     date=now.date())
        if db_today_section is None:
            db_today_section = crud.section.create_section(db=db, 
                                                           creator_id=user.id,
                                                           title=f'{now.date()} Summary',
                                                           public=False,
                                                           description=f"This document is the summary of all documents on {now.date()}.")
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
        second_tasks = [add_embedding.si(db_document.id, user.id), update_sections.si(document_create_request.sections, db_document.id, user.id)]
        if document_create_request.auto_summary:
            second_tasks.append(update_ai_summary.si(db_document.id, user.id))
        task_chain = chain(first_task, group(second_tasks))
        task_chain.apply_async()
    elif document_create_request.category == 0:
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
                                                                     date=now.date())
        if db_today_section is None:
            db_today_section = crud.section.create_section(db=db, 
                                                           creator_id=user.id,
                                                           title=f'{now.date()} Summary',
                                                           public=False,
                                                           description=f'This document is the summary of all documents on {now.date()}.')
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
        first_task = init_file_document_info.si(db_document.id, user.id)
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
                                                                     date=now.date())
        if db_today_section is None:
            db_today_section = crud.section.create_section(db=db, 
                                                           creator_id=user.id,
                                                           title=f'{now.date()} Summary',
                                                           public=False,
                                                           description=f'This document is the summary of all documents on {now.date()}.')
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

@document_router.post("/label/list", response_model=schemas.document.LabelListResponse)
async def list_label(db: Session = Depends(get_db), 
                     user: schemas.user.PrivateUserInfo = Depends(get_current_user)):
    labels = crud.document.get_user_labels_by_user_id(db=db, 
                                                      user_id=user.id)
    labels = jsonable_encoder(labels)
    return schemas.document.LabelListResponse(data=labels)

@document_router.post('/label/create', response_model=schemas.document.CreateLabelResponse)
async def add_label(label_add_request: schemas.document.LabelAddRequest,
                    db: Session = Depends(get_db), 
                    user: schemas.user.PrivateUserInfo = Depends(get_current_user)):
    db_label = crud.document.create_label(db=db, 
                                          name=label_add_request.name, 
                                          user_id=user.id)
    db.commit()
    return schemas.document.CreateLabelResponse(id=db_label.id, name=db_label.name)
    
@document_router.post('/unread/search', response_model=schemas.pagination.InifiniteScrollPagnition[schemas.document.DocumentInfo])
async def search_user_unread_documents(search_unread_list_request: schemas.document.SearchUnreadListRequest, 
                                       db: Session = Depends(get_db), 
                                       user: schemas.user.PrivateUserInfo = Depends(get_current_user)):
    has_more = True
    next_start = None
    documents = crud.document.search_user_unread_documents(db=db, 
                                                           user_id=user.id, 
                                                           start=search_unread_list_request.start,
                                                           limit=search_unread_list_request.limit,
                                                           keyword=search_unread_list_request.keyword,
                                                           label_ids=search_unread_list_request.label_ids,
                                                           desc=search_unread_list_request.desc)
    def get_document_info(document: models.document.Document): 
        db_labels = crud.document.get_labels_by_document_id(db=db,
                                                            document_id=document.id)
        db_transform_task = crud.task.get_document_transform_task_by_document_id(db=db,
                                                                                 document_id=document.id)
        return schemas.document.DocumentInfo(
            **document.__dict__,
            labels=db_labels,
            transform_task=db_transform_task
        )
    documents = [get_document_info(document) for document in documents]
    if len(documents) < search_unread_list_request.limit or len(documents) == 0:
        has_more = False
    if len(documents) == search_unread_list_request.limit:
        next_notification = crud.document.search_next_user_unread_document(db=db, 
                                                                           user_id=user.id, 
                                                                           document=documents[-1],
                                                                           keyword=search_unread_list_request.keyword,
                                                                           label_ids=search_unread_list_request.label_ids,
                                                                           desc=search_unread_list_request.desc)
        has_more = next_notification is not None
        next_start = next_notification.id if has_more else None
    total = crud.document.count_user_unread_documents(db=db,
                                                      user_id=user.id,
                                                      keyword=search_unread_list_request.keyword,
                                                      label_ids=search_unread_list_request.label_ids)
    return schemas.pagination.InifiniteScrollPagnition(
        total=total,
        elements=documents,
        start=search_unread_list_request.start,
        limit=search_unread_list_request.limit,
        has_more=has_more,
        next_start=next_start
    )
    
@document_router.post('/vector/search', response_model=schemas.document.VectorSearchResponse)
async def search_knowledge_vector(vector_search_request: schemas.document.VectorSearchRequest, 
                                  db: Session = Depends(get_db), 
                                  user: schemas.user.PrivateUserInfo = Depends(get_current_user)):
    query_dense_embedding, query_sparse_embedding = process_query(vector_search_request.query)
    hybrid_results = hybrid_search(
        milvus_client=milvus_client,
        collection_name='document',
        query_dense_embedding=query_dense_embedding,
        query_sparse_embedding=query_sparse_embedding,
    )
    document_ids = [doc.get('entity').get('document_id') for doc in hybrid_results]
    documents = [doc for doc in crud.document.get_documents_by_document_ids(db=db,
                                                                            document_ids=document_ids)]
    return schemas.document.VectorSearchResponse(documents=documents)
    
@document_router.post('/recent/search', response_model=schemas.pagination.InifiniteScrollPagnition[schemas.document.DocumentInfo])
async def recent_read_document(search_recent_read_request: schemas.document.SearchRecentReadRequest, 
                               db: Session = Depends(get_db), 
                               user: schemas.user.PrivateUserInfo = Depends(get_current_user)):
    has_more = True
    next_start = None
    documents = crud.document.search_user_recent_read_documents(db=db, 
                                                                user_id=user.id, 
                                                                start=search_recent_read_request.start,
                                                                limit=search_recent_read_request.limit,
                                                                keyword=search_recent_read_request.keyword,
                                                                label_ids=search_recent_read_request.label_ids,
                                                                desc=search_recent_read_request.desc)
    def get_document_info(document: models.document.Document): 
        db_labels = crud.document.get_labels_by_document_id(db=db,
                                                            document_id=document.id)
        return schemas.document.DocumentInfo(
            **document.__dict__,
            labels=db_labels
        )
    documents = [get_document_info(document) for document in documents]
    if len(documents) < search_recent_read_request.limit or len(documents) == 0:
        has_more = False
    if len(documents) == search_recent_read_request.limit:
        next_notification = crud.document.search_next_user_recent_read_document(db=db, 
                                                                                user_id=user.id, 
                                                                                document=documents[-1],
                                                                                keyword=search_recent_read_request.keyword,
                                                                                label_ids=search_recent_read_request.label_ids,
                                                                                desc=search_recent_read_request.desc)
        has_more = next_notification is not None
        next_start = next_notification.id if has_more else None
    total = crud.document.count_user_recent_read_documents(db=db,
                                                           user_id=user.id,
                                                           keyword=search_recent_read_request.keyword,
                                                           label_ids=search_recent_read_request.label_ids)
    return schemas.pagination.InifiniteScrollPagnition(
        total=total,
        elements=documents,
        start=search_recent_read_request.start,
        limit=search_recent_read_request.limit,
        has_more=has_more,
        next_start=next_start
    )
    
@document_router.post('/detail', response_model=schemas.document.DocumentDetailResponse)
async def get_document_detail(document_detail_request: schemas.document.DocumentDetailRequest, 
                              db: Session = Depends(get_db), 
                              user: schemas.user.PrivateUserInfo = Depends(get_current_user)):
    document = crud.document.get_document_by_document_id(db=db, 
                                                         document_id=document_detail_request.document_id)
    if document is None:
        raise Exception('The document is not exist')
    is_star = crud.document.get_star_document_by_document_id(db=db, 
                                                             user_id=user.id, 
                                                             document_id=document_detail_request.document_id) is not None
    is_read = crud.document.get_read_document_by_document_id(db=db, 
                                                             user_id=user.id, 
                                                             document_id=document_detail_request.document_id) is not None
    db_sections = crud.document.get_sections_by_document_id(db=db,
                                                            document_id=document_detail_request.document_id)
    db_labels = crud.document.get_labels_by_document_id(db=db,
                                                        document_id=document_detail_request.document_id)
    res = schemas.document.DocumentDetailResponse(id=document.id, 
                                                  labels=db_labels,
                                                  sections=db_sections,
                                                  title=document.title,
                                                  category=document.category,
                                                  description=document.description,
                                                  creator=document.creator,
                                                  cover=document.cover,
                                                  ai_summary=document.ai_summary,
                                                  from_plat=document.from_plat,
                                                  create_time=document.create_time, 
                                                  update_time=document.update_time)
    res.is_star = is_star
    res.is_read = is_read
    transform_task = crud.task.get_document_transform_task_by_document_id(db=db,
                                                                          document_id=document_detail_request.document_id)
    res.transform_task = transform_task
    if document.category == 1:
        website_document = crud.document.get_website_document_by_document_id(db=db, 
                                                                             document_id=document_detail_request.document_id)
        res.website_info = schemas.document.WebsiteDocumentInfo(url=website_document.url, 
                                                                md_file_name=website_document.md_file_name)
    elif document.category == 0:
        file_document = crud.document.get_file_document_by_document_id(db=db, 
                                                                       document_id=document_detail_request.document_id)
        res.file_info = schemas.document.FileDocumentInfo(file_name=file_document.file_name,
                                                          md_file_name=file_document.md_file_name)
    elif document.category == 2:
        quick_note_document = crud.document.get_quick_note_document_by_document_id(db=db, 
                                                                                   document_id=document_detail_request.document_id)
        res.quick_note_info = schemas.document.QuickNoteDocumentInfo(content=quick_note_document.content)
    return res

@document_router.post('/star', response_model=SuccessResponse)
async def star_document(star_request: schemas.document.StarRequest, 
                        db: Session = Depends(get_db), 
                        user: schemas.user.PrivateUserInfo = Depends(get_current_user)):
    db_document = crud.document.get_document_by_document_id(db=db, 
                                                            document_id=star_request.document_id)
    if db_document is None:
        raise Exception("The document is not found")
    if star_request.status is False:
        crud.document.unstar_document_by_document_id(db=db, 
                                                     user_id=user.id, 
                                                     document_id=star_request.document_id)
    elif star_request.status is True:
        crud.document.star_document_by_document_id(db=db, 
                                                user_id=user.id, 
                                                document_id=star_request.document_id)
    db.commit()
    return schemas.common.SuccessResponse(message="The star status of the document is successfully updated")

@document_router.post('/read', response_model=SuccessResponse)
async def read_document(read_request: schemas.document.ReadRequest, 
                        db: Session = Depends(get_db), 
                        user: schemas.user.PrivateUserInfo = Depends(get_current_user)):
    db_document = crud.document.get_document_by_document_id(db=db, 
                                                            document_id=read_request.document_id)
    if db_document is None:
        raise Exception("The document is not found")
    if read_request.status is False:
        crud.document.unread_document_by_document_id(db=db, 
                                                     user_id=user.id, 
                                                     document_id=read_request.document_id)
    elif read_request.status is True:
        crud.document.read_document_by_document_id(db=db, 
                                                   user_id=user.id, 
                                                   document_id=read_request.document_id)
    db.commit()
    return schemas.common.SuccessResponse(message="The read status of the document is successfully updated")

@document_router.post('/delete', response_model=SuccessResponse)
async def delete_document(documents_delete_request: schemas.document.DocumentDeleteRequest, 
                          db: Session = Depends(get_db), 
                          user: models.user.User = Depends(get_current_user)):
    crud.document.delete_user_documents_by_document_ids(db=db, 
                                                        document_ids=documents_delete_request.document_ids, 
                                                        user_id=user.id)
    expr = f"document_id IN {documents_delete_request.document_ids}"
    milvus_client.delete(
        "document",
        filter=expr,
    )   
    db.commit()
    return SuccessResponse(message="The documents is deleted successfully")

@document_router.post('/search/mine', response_model=schemas.pagination.InifiniteScrollPagnition[schemas.document.DocumentInfo])
async def search_all_mine_documents(search_all_my_document_request: schemas.document.SearchAllMyDocumentsRequest, 
                                    db: Session = Depends(get_db), 
                                    user: schemas.user.PrivateUserInfo = Depends(get_current_user)):
    has_more = True
    next_start = None
    documents = crud.document.search_user_documents(db=db, 
                                                    user_id=user.id, 
                                                    start=search_all_my_document_request.start,
                                                    limit=search_all_my_document_request.limit,
                                                    keyword=search_all_my_document_request.keyword,
                                                    label_ids=search_all_my_document_request.label_ids,
                                                    desc=search_all_my_document_request.desc)
    def get_document_info(document: models.document.Document): 
        db_labels = crud.document.get_labels_by_document_id(db=db,
                                                            document_id=document.id)
        return schemas.document.DocumentInfo(
            **document.__dict__,
            labels=db_labels
        )
    documents = [get_document_info(document) for document in documents]
    if len(documents) < search_all_my_document_request.limit or len(documents) == 0:
        has_more = False
    if len(documents) == search_all_my_document_request.limit:
        next_notification = crud.document.search_next_user_document(db=db, 
                                                                    user_id=user.id, 
                                                                    document=documents[-1],
                                                                    keyword=search_all_my_document_request.keyword,
                                                                    label_ids=search_all_my_document_request.label_ids,
                                                                    desc=search_all_my_document_request.desc)
        has_more = next_notification is not None
        next_start = next_notification.id if has_more else None
    total = crud.document.count_user_documents(db=db,
                                               user_id=user.id,
                                               keyword=search_all_my_document_request.keyword,
                                               label_ids=search_all_my_document_request.label_ids)
    return schemas.pagination.InifiniteScrollPagnition(
        total=total,
        elements=documents,
        start=search_all_my_document_request.start,
        limit=search_all_my_document_request.limit,
        has_more=has_more,
        next_start=next_start
    )

@document_router.post('/star/search', response_model=schemas.pagination.InifiniteScrollPagnition[schemas.document.DocumentInfo])
async def search_my_star_documents(search_my_star_documents_request: schemas.document.SearchMyStarDocumentsRequest, 
                                   db: Session = Depends(get_db), 
                                   user: schemas.user.PrivateUserInfo = Depends(get_current_user)):
    has_more = True
    next_start = None
    documents = crud.document.search_user_stared_documents(db=db, 
                                                           user_id=user.id, 
                                                           start=search_my_star_documents_request.start,
                                                           limit=search_my_star_documents_request.limit,
                                                           keyword=search_my_star_documents_request.keyword,
                                                           label_ids=search_my_star_documents_request.label_ids,
                                                           desc=search_my_star_documents_request.desc)
    def get_document_info(document: models.document.Document): 
        db_labels = crud.document.get_labels_by_document_id(db=db,
                                                            document_id=document.id)
        return schemas.document.DocumentInfo(
            **document.__dict__,
            labels=db_labels
        )
    documents = [get_document_info(document) for document in documents]
    if len(documents) < search_my_star_documents_request.limit or len(documents) == 0:
        has_more = False
    if len(documents) == search_my_star_documents_request.limit:
        next_notification = crud.document.search_next_user_star_document(db=db, 
                                                                         user_id=user.id, 
                                                                         document=documents[-1],
                                                                         keyword=search_my_star_documents_request.keyword,
                                                                         label_ids=search_my_star_documents_request.label_ids,
                                                                         desc=search_my_star_documents_request.desc)
        has_more = next_notification is not None
        next_start = next_notification.id if has_more else None
    total = crud.document.count_user_stared_documents(db=db, 
                                                      user_id=user.id, 
                                                      keyword=search_my_star_documents_request.keyword, 
                                                      label_ids=search_my_star_documents_request.label_ids)
    return schemas.pagination.InifiniteScrollPagnition(
        total=total,
        elements=documents,
        start=search_my_star_documents_request.start,
        limit=search_my_star_documents_request.limit,
        has_more=has_more,
        next_start=next_start
    )