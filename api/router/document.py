import crud
import models
import schemas
from celery import chain
from datetime import datetime, timezone
from schemas.common import SuccessResponse
from sqlalchemy.orm import Session
from fastapi import APIRouter, Depends
from common.ai import summary_document
from common.dependencies import get_db
from data.milvus.search import naive_search
from data.milvus.create import milvus_client
from typing import cast
from common.dependencies import get_db, get_current_user
from common.common import get_user_remote_file_system
from common.celery.app import start_process_document, update_sections_for_document, start_process_document_podcast, update_document_process_status
from enums.document import DocumentCategory, DocumentMdConvertStatus, DocumentPodcastStatus, DocumentProcessStatus, UserDocumentAuthority
from enums.section import UserSectionRole, UserSectionAuthority, SectionDocumentIntegration

document_router = APIRouter()

@document_router.post('/label/summary', response_model=schemas.document.LabelSummaryResponse)
async def get_label_summary(
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
                label_info=schemas.document.Label(
                    id=label.id,
                    name=label.name
                ),
                count=count)
        )
    return schemas.document.LabelSummaryResponse(data=res)

@document_router.post('/label/delete', response_model=schemas.common.NormalResponse)
async def delete_label(
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
async def list_label(
    db: Session = Depends(get_db), 
    user: models.user.User = Depends(get_current_user)
):
    db_labels = crud.document.get_user_labels_by_user_id(
        db=db, 
        user_id=user.id
    )
    labels = [
        schemas.document.Label(id=label.id, name=label.name) for label in db_labels
    ]
    return schemas.document.LabelListResponse(data=labels)

@document_router.post('/label/create', response_model=schemas.document.CreateLabelResponse)
async def add_label(
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
async def create_note(
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
async def delete_note(
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
async def search_note(
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
    if user.default_user_file_system is None:
        raise Exception('Please set the default file system for the user first.')
    else:
        remote_file_service = await get_user_remote_file_system(
            user_id=user.id
        )
        await remote_file_service.init_client_by_user_file_system_id(
            user_file_system_id=user.default_user_file_system
        )
        
    db_document = crud.document.get_document_by_document_id(
        db=db,
        document_id=ai_summary_request.document_id
    )
    if db_document is None:
        raise Exception('The document you want to summary is not found')
    if db_document.category == DocumentCategory.WEBSITE or db_document.category == DocumentCategory.FILE:
        db_convert_task = crud.task.get_document_convert_task_by_document_id(
            db=db,
            document_id=ai_summary_request.document_id
        )
        if db_convert_task is None or db_convert_task.status != DocumentMdConvertStatus.SUCCESS or db_convert_task.md_file_name is None:
            raise Exception("The document convert task of the document you want to summary havn't been finished")
        markdown_content = await remote_file_service.get_file_content_by_file_path(
            file_path=db_convert_task.md_file_name
        )
    if db_document.category == DocumentCategory.QUICK_NOTE:
        db_quick_note_document = crud.document.get_quick_note_document_by_document_id(
            db=db,
            document_id=ai_summary_request.document_id
        )
        if db_quick_note_document is None:
            raise Exception('The document you want to summary has no quick note info')
        markdown_content = db_quick_note_document.content
    model_id = user.default_document_reader_model_id
    if model_id is None:
        raise Exception('Please set the default document reader model for the user first.')
    ai_summary_result = summary_document(
        user_id=user.id, 
        model_id=model_id, 
        markdown_content=markdown_content
    )
    db_document = crud.document.get_document_by_document_id(
        db=db,
        document_id=ai_summary_request.document_id
    )
    if db_document is None:
        raise Exception('The document you want to summary is not found')
    db_document.title = ai_summary_result.title
    db_document.description = ai_summary_result.description
    db_document.ai_summary = ai_summary_result.summary
    db.commit()
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
        raise Exception('The document you want to generate the podcast is not found')
    
    # podcast必须要存储系统，所以检查用户的存储系统配置
    if user.default_user_file_system is None:
        raise Exception('Please set the default file system for the user first.')
    else:
        remote_file_service = await get_user_remote_file_system(
            user_id=user.id
        )
        await remote_file_service.init_client_by_user_file_system_id(
            user_file_system_id=user.default_user_file_system
        )
    
    db_exist_podcast_task = crud.task.get_document_podcast_task_by_document_id(
        db=db,
        document_id=generate_podcast_request.document_id
    )
    if db_exist_podcast_task is not None:
        if db_exist_podcast_task.status == DocumentPodcastStatus.SUCCESS:
            raise Exception('The podcast task is already finished, please refresh the page')
        if db_exist_podcast_task.status == DocumentPodcastStatus.WAIT_TO:
            raise Exception('The podcast task is already in the queue, please wait')
        if db_exist_podcast_task.status == DocumentPodcastStatus.GENERATING:
            raise Exception('The podcast task is already processing, please wait')

    db_process_task = crud.task.get_document_process_task_by_document_id(
        db=db,
        document_id=generate_podcast_request.document_id
    )
    if db_process_task is None:
        raise Exception('The document you want to generate the podcast is not processed')
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
async def get_month_summary(
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
    user: models.user.User = Depends(get_current_user)
):
    now = datetime.now(timezone.utc)
    db_document = None
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
            document_id=db_document.id,
            url=document_create_request.url,
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
    background_tasks = chain(
        start_process_document.si(
            document_id=db_document.id, 
            user_id=user.id, 
            auto_summary=document_create_request.auto_summary,
            auto_podcast=document_create_request.auto_podcast
        ),
        update_sections_for_document.si(
            document_id=db_document.id, 
            user_id=user.id
        )
    )
    background_tasks.apply_async()
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
        raise Exception('The document you want to transform is not found')

    if user.default_user_file_system is None:
        raise Exception("The user havn't set the default file system yet")
    else:
        remote_file_service = await get_user_remote_file_system(
            user_id=user.id
        )
        await remote_file_service.init_client_by_user_file_system_id(
            user_file_system_id=user.default_user_file_system
        )
    db_process_task = crud.task.get_document_process_task_by_document_id(
        db=db,
        document_id=transform_markdown_request.document_id
    )
    if db_process_task is None:
        raise Exception('The document you want to transform is not processed')
    db_process_task.status = DocumentProcessStatus.PROCESSING
    db.commit()
    
    db_convert_task = crud.task.get_document_convert_task_by_document_id(
        db=db,
        document_id=transform_markdown_request.document_id
    )
    # 如果该文档的转化任务存在
    if db_convert_task is not None:
        if db_convert_task.status == DocumentMdConvertStatus.SUCCESS:
            raise Exception('The transform task is already finished, please refresh the page')
        elif db_convert_task.status == DocumentMdConvertStatus.WAIT_TO:
            raise Exception('The transform task is already in the queue, please wait')
        elif db_convert_task.status == DocumentMdConvertStatus.CONVERTING:
            raise Exception('The transform task is already processing, please wait')
        db_convert_task.status = DocumentMdConvertStatus.WAIT_TO
    # 如果该文档的转化任务不存在
    else:
        db_convert_task = crud.task.create_document_convert_task(
            db=db,
            user_id=user.id,
            document_id=transform_markdown_request.document_id
        )

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
        raise schemas.error.CustomException("You dont have permission to update this document", code=403)
    
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
            update_sections_for_document.delay(
                document_id=db_document.id, 
                user_id=user.id
            )
    db_document.update_time = now
    db.commit()
    return schemas.common.NormalResponse()

def get_document_info(
    db: Session,
    document: models.document.Document
): 
    convert_task = None
    embedding_task = None
    graph_task = None
    process_task = None
    podcast_task = None
    db_convert_task = crud.task.get_document_convert_task_by_document_id(
        db=db,
        document_id=document.id
    )
    if db_convert_task is not None:
        convert_task = schemas.task.DocumentConvertTask(
            creator_id=document.creator_id,
            status=db_convert_task.status,
            md_file_name=db_convert_task.md_file_name,
        )
    db_embedding_task = crud.task.get_document_embedding_task_by_document_id(
        db=db,
        document_id=document.id
    )
    if db_embedding_task is not None:
        embedding_task = schemas.task.DocumentEmbeddingTask(
            creator_id=document.creator_id,
            status=db_embedding_task.status
        )
    db_graph_task = crud.task.get_document_graph_task_by_document_id(
        db=db,
        document_id=document.id
    )
    if db_graph_task is not None:
        graph_task = schemas.task.DocumentGraphTask(
            creator_id=document.creator_id,
            status=db_graph_task.status
        )
    db_podcast_task = crud.task.get_document_podcast_task_by_document_id(
        db=db,
        document_id=document.id
    )
    if db_podcast_task is not None:
        podcast_task = schemas.task.DocumentPodcastTask(
            creator_id=document.creator_id,
            status=db_podcast_task.status,
            podcast_file_name=db_podcast_task.podcast_file_name
        )
    db_process_task = crud.task.get_document_process_task_by_document_id(
        db=db,
        document_id=document.id
    )
    if db_process_task is not None:
        process_task = schemas.task.DocumentProcessTask(
            creator_id=document.creator_id,
            status=db_process_task.status
        )
    db_labels = crud.document.get_labels_by_document_id(
        db=db,
        document_id=document.id
    )
    labels = [
        schemas.document.Label(
            id=label.id,
            name=label.name
        ) for label in db_labels
    ]
    res = schemas.document.DocumentInfo.model_validate(document)
    res.labels = labels
    res.convert_task=convert_task
    res.embedding_task=embedding_task
    res.graph_task=graph_task
    res.process_task=process_task
    res.podcast_task = podcast_task
    return res

@document_router.post('/detail', response_model=schemas.document.DocumentDetailResponse)
async def get_document_detail(
    document_detail_request: schemas.document.DocumentDetailRequest, 
    db: Session = Depends(get_db), 
    user: models.user.User = Depends(get_current_user)
):
    document = crud.document.get_document_by_document_id(
        db=db, 
        document_id=document_detail_request.document_id
    )
    if document is None:
        raise Exception('The document is not exist')
    # 判断用户是否有权限访问这份文档
    if document.creator_id != user.id:
        # 如果文档属于公开的某一份专栏中，那就可以
        db_published_section_documents = crud.document.get_published_section_of_the_document_by_document_id(
            db=db,
            document_id=document_detail_request.document_id
        )
        if len(db_published_section_documents) == 0:
            # 判断用户是否是该文档相关的专栏的参与者
            db_user_published_section_documents = crud.document.get_published_section_of_the_document_by_document_id(
                db=db,
                document_id=document_detail_request.document_id,
                user_id=user.id
            )
            if len(db_user_published_section_documents) == 0:
                raise Exception('You have no permission to access this document')

    is_star = crud.document.get_star_document_by_user_id_and_document_id(
        db=db, 
        user_id=user.id, 
        document_id=document_detail_request.document_id
    ) is not None
    is_read = crud.document.get_read_document_by_document_id_and_user_id(
        db=db, 
        user_id=user.id, 
        document_id=document_detail_request.document_id
    ) is not None
    db_sections = crud.document.get_sections_by_document_id(
        db=db,
        document_id=document_detail_request.document_id
    )
    sections = [
        schemas.document.BaseSectionInfo(
            id=section.id,
            title=section.title,
            description=section.description
        )
        for section in db_sections
    ]
    db_labels = crud.document.get_labels_by_document_id(
        db=db,
        document_id=document_detail_request.document_id
    )
    labels = [
        schemas.document.Label(
            id=label.id,
            name=label.name
        ) for label in db_labels
    ]
    res = schemas.document.DocumentDetailResponse(
        id=document.id, 
        labels=labels,
        sections=sections,
        title=document.title,
        category=document.category,
        description=document.description,
        creator=document.creator,
        cover=document.cover,
        ai_summary=document.ai_summary,
        from_plat=document.from_plat,
        create_time=document.create_time, 
        update_time=document.update_time,
        is_star=is_star,
        is_read=is_read
    )
    if document.category == DocumentCategory.WEBSITE:
        website_document = crud.document.get_website_document_by_document_id(
            db=db, 
            document_id=document_detail_request.document_id
        )
        if website_document is not None:
            res.website_info = schemas.document.WebsiteDocumentInfo(
                creator_id=document.creator_id,
                url=website_document.url
            )
    elif document.category == DocumentCategory.FILE:
        file_document = crud.document.get_file_document_by_document_id(
            db=db, 
            document_id=document_detail_request.document_id
        )
        if file_document is not None:
            res.file_info = schemas.document.FileDocumentInfo(
                creator_id=document.creator_id,
                file_name=file_document.file_name
            )
    elif document.category == DocumentCategory.QUICK_NOTE:
        quick_note_document = crud.document.get_quick_note_document_by_document_id(
            db=db, 
            document_id=document_detail_request.document_id
        )
        if quick_note_document is not None:
            res.quick_note_info = schemas.document.QuickNoteDocumentInfo(
                creator_id=document.creator_id,
                content=quick_note_document.content
            )
    convert_task = crud.task.get_document_convert_task_by_document_id(
        db=db,
        document_id=document_detail_request.document_id
    )
    if convert_task is not None:
        res.convert_task = schemas.document.DocumentConvertTask(
            creator_id=convert_task.user_id,
            status=convert_task.status,
            md_file_name=convert_task.md_file_name
        )
    podcast_task = crud.task.get_document_podcast_task_by_document_id(
        db=db,
        document_id=document_detail_request.document_id
    )
    if podcast_task is not None:
        res.podcast_task = schemas.document.DocumentPodcastTask(
            creator_id=podcast_task.user_id,
            status=podcast_task.status,
            podcast_file_name=podcast_task.podcast_file_name
        )
    embedding_task = crud.task.get_document_embedding_task_by_document_id(
        db=db,
        document_id=document_detail_request.document_id
    )
    res.embedding_task = embedding_task
    graph_task = crud.task.get_document_graph_task_by_document_id(
        db=db,
        document_id=document_detail_request.document_id
    )
    res.graph_task = graph_task
    process_task = crud.task.get_document_process_task_by_document_id(
        db=db,
        document_id=document_detail_request.document_id
    )
    res.process_task = process_task
    return res

@document_router.post('/unread/search', response_model=schemas.pagination.InifiniteScrollPagnition[schemas.document.DocumentInfo])
async def search_user_unread_documents(
    search_unread_list_request: schemas.document.SearchUnreadListRequest, 
    db: Session = Depends(get_db), 
    user: models.user.User = Depends(get_current_user)
):
    has_more = True
    next_start = None
    next_document = None
    db_documents = crud.document.search_user_unread_documents(
        db=db, 
        user_id=user.id, 
        start=search_unread_list_request.start,
        limit=search_unread_list_request.limit,
        keyword=search_unread_list_request.keyword,
        label_ids=search_unread_list_request.label_ids,
        desc=search_unread_list_request.desc
    )
    
    documents = [
        get_document_info(
            db=db,
            document=document
        ) for document in db_documents
    ]
    if len(documents) < search_unread_list_request.limit or len(documents) == 0:
        has_more = False
    if len(documents) == search_unread_list_request.limit:
        next_document = crud.document.search_next_user_unread_document(
            db=db, 
            user_id=user.id, 
            document=db_documents[-1],
            keyword=search_unread_list_request.keyword,
            label_ids=search_unread_list_request.label_ids,
            desc=search_unread_list_request.desc
        )
        has_more = next_document is not None
        next_start = next_document.id if next_document is not None else None
    total = crud.document.count_user_unread_documents(
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
    
@document_router.post('/recent/search', response_model=schemas.pagination.InifiniteScrollPagnition[schemas.document.DocumentInfo])
async def recent_read_document(
    search_recent_read_request: schemas.document.SearchRecentReadRequest, 
    db: Session = Depends(get_db), 
    user: models.user.User = Depends(get_current_user)
):
    has_more = True
    next_start = None
    next_document = None
    db_documents = crud.document.search_user_recent_read_documents(
        db=db, 
        user_id=user.id, 
        start=search_recent_read_request.start,
        limit=search_recent_read_request.limit,
        keyword=search_recent_read_request.keyword,
        label_ids=search_recent_read_request.label_ids,
        desc=search_recent_read_request.desc
    )
    documents = [
        get_document_info(
            db=db,
            document=document
        ) for document in db_documents
    ]
    if len(documents) < search_recent_read_request.limit or len(documents) == 0:
        has_more = False
    if len(documents) == search_recent_read_request.limit:
        next_document = crud.document.search_next_user_recent_read_document(
            db=db, 
            user_id=user.id, 
            document=db_documents[-1],
            keyword=search_recent_read_request.keyword,
            label_ids=search_recent_read_request.label_ids,
            desc=search_recent_read_request.desc
        )
        has_more = next_document is not None
        next_start = next_document.id if next_document is not None else None
    total = crud.document.count_user_recent_read_documents(
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

@document_router.post('/search/mine', response_model=schemas.pagination.InifiniteScrollPagnition[schemas.document.DocumentInfo])
async def search_all_mine_documents(
    search_all_my_document_request: schemas.document.SearchAllMyDocumentsRequest, 
    db: Session = Depends(get_db), 
    user: models.user.User = Depends(get_current_user)
):
    has_more = True
    next_start = None
    next_document = None
    db_documents = crud.document.search_user_documents(
        db=db, 
        user_id=user.id, 
        start=search_all_my_document_request.start,
        limit=search_all_my_document_request.limit,
        keyword=search_all_my_document_request.keyword,
        label_ids=search_all_my_document_request.label_ids,
        desc=search_all_my_document_request.desc
    )
    documents = [
        get_document_info(
            db=db,
            document=document
        ) for document in db_documents
    ]
    if len(documents) < search_all_my_document_request.limit or len(documents) == 0:
        has_more = False
    if len(documents) == search_all_my_document_request.limit:
        next_document = crud.document.search_next_user_document(
            db=db, 
            user_id=user.id, 
            document=db_documents[-1],
            keyword=search_all_my_document_request.keyword,
            label_ids=search_all_my_document_request.label_ids,
            desc=search_all_my_document_request.desc
        )
        has_more = next_document is not None
        next_start = next_document.id if next_document is not None else None
    total = crud.document.count_user_documents(
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

@document_router.post('/star/search', response_model=schemas.pagination.InifiniteScrollPagnition[schemas.document.DocumentInfo])
async def search_my_star_documents(
    search_my_star_documents_request: schemas.document.SearchMyStarDocumentsRequest, 
    db: Session = Depends(get_db), 
    user: models.user.User = Depends(get_current_user)
):
    has_more = True
    next_start = None
    next_document = None
    db_documents = crud.document.search_user_stared_documents(
        db=db, 
        user_id=user.id, 
        start=search_my_star_documents_request.start,
        limit=search_my_star_documents_request.limit,
        keyword=search_my_star_documents_request.keyword,
        label_ids=search_my_star_documents_request.label_ids,
        desc=search_my_star_documents_request.desc
    )
    documents = [
        get_document_info(
            db=db,
            document=document
        ) for document in db_documents
    ]
    if len(documents) < search_my_star_documents_request.limit or len(documents) == 0:
        has_more = False
    if len(documents) == search_my_star_documents_request.limit:
        next_document = crud.document.search_next_user_star_document(
            db=db, 
            user_id=user.id, 
            document=db_documents[-1],
            keyword=search_my_star_documents_request.keyword,
            label_ids=search_my_star_documents_request.label_ids,
            desc=search_my_star_documents_request.desc
        )
        has_more = next_document is not None
        next_start = next_document.id if next_document is not None else None
    total = crud.document.count_user_stared_documents(
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

@document_router.post('/vector/search', response_model=schemas.document.VectorSearchResponse)
async def search_knowledge_vector(
    vector_search_request: schemas.document.VectorSearchRequest, 
    db: Session = Depends(get_db), 
    user: models.user.User = Depends(get_current_user)
):
    hybrid_results = naive_search(
        user_id=user.id,
        search_text=vector_search_request.query
    )
    document_ids: list[int] = [cast(int, doc.get('doc_id')) for doc in hybrid_results]
    db_documents = crud.document.get_documents_by_document_ids(
        db=db,
        document_ids=document_ids
    )
    documents = [
        schemas.document.DocumentInfo.model_validate(document) for document in db_documents
    ]
    return schemas.document.VectorSearchResponse(documents=documents)

@document_router.post('/star', response_model=SuccessResponse)
async def star_document(
    star_request: schemas.document.StarRequest, 
    db: Session = Depends(get_db), 
    user: models.user.User = Depends(get_current_user)
):
    db_document = crud.document.get_document_by_document_id(
        db=db, 
        document_id=star_request.document_id
    )
    if db_document is None:
        raise Exception("The document is not found")
    if star_request.status is False:
        crud.document.unstar_document_by_document_id(
            db=db, 
            user_id=user.id, 
            document_id=star_request.document_id
        )
    elif star_request.status is True:
        crud.document.star_document_by_document_id(
            db=db, 
            user_id=user.id, 
            document_id=star_request.document_id
        )
    db.commit()
    return schemas.common.SuccessResponse(message="The star status of the document is successfully updated")

@document_router.post('/read', response_model=SuccessResponse)
async def read_document(
    read_request: schemas.document.ReadRequest, 
    db: Session = Depends(get_db), 
    user: models.user.User = Depends(get_current_user)
):
    db_document = crud.document.get_document_by_document_id(
        db=db, 
        document_id=read_request.document_id
    )
    if db_document is None:
        raise Exception("The document is not found")
    if read_request.status is False:
        crud.document.unread_document_by_document_id(
            db=db, 
            user_id=user.id, 
            document_id=read_request.document_id
        )
    elif read_request.status is True:
        crud.document.read_document_by_document_id(
            db=db, 
            user_id=user.id, 
            document_id=read_request.document_id
        )
    db.commit()
    return schemas.common.SuccessResponse(message="The read status of the document is successfully updated")

@document_router.post('/delete', response_model=SuccessResponse)
async def delete_document(
    documents_delete_request: schemas.document.DocumentDeleteRequest, 
    db: Session = Depends(get_db), 
    user: models.user.User = Depends(get_current_user)
):
    for document_id in documents_delete_request.document_ids:
        db_document = crud.document.get_document_by_document_id(
            db=db, 
            document_id=document_id
        )
        if db_document is None:
            raise Exception("The document is not found")
        if db_document.user_id != user.id:
            raise Exception("You are not the owner of the document")
    # TODO 需要补充一些删除附属资源的逻辑
    crud.document.delete_user_documents_by_document_ids(
        db=db, 
        document_ids=documents_delete_request.document_ids, 
        user_id=user.id
    )
    expr = f"doc_id IN {documents_delete_request.document_ids}"
    milvus_client.delete(
        collection_name="document",
        filter=expr,
    )   
    db.commit()
    return SuccessResponse(message="The documents is deleted successfully")