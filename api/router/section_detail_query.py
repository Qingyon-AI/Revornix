from datetime import datetime

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

import crud
import models
import schemas
from common.dependencies import get_current_user, get_current_user_without_throw, get_db
from common.file import get_remote_file_signed_url
from common.timezone import decode_cron_expr_with_timezone
from enums.section import UserSectionAuthority, UserSectionRole
from router.logic_helpers import ensure_private_section_access

section_detail_query_router = APIRouter()


async def _build_section_info_response(
    *,
    db: Session,
    db_section: models.section.Section,
    section_id: int,
    viewer_user_id: int | None,
    include_subscription_flag: bool,
) -> schemas.section.SectionInfo:
    documents_count = crud.section.count_documents_for_section_by_section_id(
        db=db,
        section_id=db_section.id,
    )
    subscribers_count = crud.section.count_users_for_section_by_section_id(
        db=db,
        section_id=db_section.id,
        filter_roles=[UserSectionRole.SUBSCRIBER],
    )
    db_labels = crud.section.get_labels_by_section_id(
        db=db,
        section_id=section_id,
    )
    labels = [schemas.section.SectionLabel(id=db_label.id, name=db_label.name) for db_label in db_labels]

    res = schemas.section.SectionInfo(
        **db_section.__dict__,
        labels=labels,
        documents_count=documents_count,
        subscribers_count=subscribers_count,
        creator=db_section.creator,
    )

    if res.md_file_name is not None:
        res.md_file_name = await get_remote_file_signed_url(
            user_id=res.creator.id,
            file_name=res.md_file_name,
        )

    db_section_podcast_task = crud.task.get_section_podcast_task_by_section_id(
        db=db,
        section_id=section_id,
    )
    if db_section_podcast_task is not None:
        res.podcast_task = schemas.section.SectionPodcastTask(
            status=db_section_podcast_task.status,
            podcast_file_name=db_section_podcast_task.podcast_file_name,
        )
        if db_section_podcast_task.podcast_file_name is not None:
            res.podcast_task.podcast_file_name = await get_remote_file_signed_url(
                user_id=db_section_podcast_task.user_id,
                file_name=db_section_podcast_task.podcast_file_name,
            )

    db_section_process_task = crud.task.get_section_process_task_by_section_id(
        db=db,
        section_id=section_id,
    )
    if db_section_process_task is not None:
        res.process_task = schemas.section.SectionProcessTask(
            status=db_section_process_task.status,
        )

    if viewer_user_id is not None:
        db_section_user = crud.section.get_section_user_by_section_id_and_user_id(
            db=db,
            section_id=section_id,
            user_id=viewer_user_id,
        )
        if db_section_user is not None:
            res.authority = UserSectionAuthority(db_section_user.authority)
            if include_subscription_flag and db_section_user.role == UserSectionRole.SUBSCRIBER:
                res.is_subscribed = True

    return res


@section_detail_query_router.post('/documents', response_model=schemas.pagination.InifiniteScrollPagnition[schemas.section.SectionDocumentInfo])
def section_document_request(
    section_document_request: schemas.section.SectionDocumentRequest,
    db: Session = Depends(get_db),
    user: models.user.User = Depends(get_current_user_without_throw)
):
    db_section = crud.section.get_section_by_section_id(
        db=db,
        section_id=section_document_request.section_id
    )
    if db_section is None:
        raise schemas.error.CustomException("Section not found", code=404)

    has_more = False
    next_start = None
    db_documents = crud.document.search_section_documents(
        db=db,
        section_id=section_document_request.section_id,
        start=section_document_request.start,
        limit=section_document_request.limit,
        keyword=section_document_request.keyword,
        desc=section_document_request.desc
    )

    document_ids = [document.id for document in db_documents]
    labels_by_document_id = crud.document.get_labels_by_document_ids(
        db=db,
        document_ids=document_ids
    )
    section_documents = crud.section.get_section_documents_by_section_id_and_document_ids(
        db=db,
        section_id=section_document_request.section_id,
        document_ids=document_ids,
    )
    section_document_by_document_id = {item.document_id: item for item in section_documents}
    documents = []
    for document in db_documents:
        db_section_document = section_document_by_document_id.get(document.id)
        if db_section_document is None:
            continue
        labels = [
            schemas.section.SectionLabel(id=label.id, name=label.name)
            for label in labels_by_document_id.get(document.id, [])
        ]
        info = schemas.section.SectionDocumentInfo(
            id=document.id,
            title=document.title,
            status=db_section_document.status,
            category=document.category,
            cover=document.cover,
            description=document.description,
            from_plat=document.from_plat,
            labels=labels,
            create_time=document.create_time,
            update_time=document.update_time,
        )
        documents.append(info)
    if section_document_request.limit > 0 and len(documents) == section_document_request.limit:
        next_document = crud.document.search_next_section_document(
            db=db,
            section_id=section_document_request.section_id,
            document=db_documents[-1],
            keyword=section_document_request.keyword,
            desc=section_document_request.desc
        )
        has_more = next_document is not None
        next_start = next_document.id if next_document is not None else None
    total = crud.document.count_section_documents(
        db=db,
        section_id=section_document_request.section_id,
        keyword=section_document_request.keyword
    )
    return schemas.pagination.InifiniteScrollPagnition(
        total=total,
        elements=documents,
        start=section_document_request.start,
        limit=section_document_request.limit,
        has_more=has_more,
        next_start=next_start
    )

@section_detail_query_router.post('/detail/seo', response_model=schemas.section.SectionInfo)
async def section_seo_detail_request(
    section_seo_detail_request: schemas.section.SectionSeoDetailRequest,
    db: Session = Depends(get_db),
    user: models.user.User = Depends(get_current_user_without_throw)
):
    db_section_publish = crud.section.get_publish_sections_by_uuid(
        db=db,
        uuid=section_seo_detail_request.uuid
    )

    if db_section_publish is None:
        raise schemas.error.CustomException("Section is not published", code=404)

    db_section = crud.section.get_section_by_section_id(
        db=db,
        section_id=db_section_publish.section_id
    )

    if db_section is None:
        raise schemas.error.CustomException("Section not found", code=404)

    return await _build_section_info_response(
        db=db,
        db_section=db_section,
        section_id=db_section.id,
        viewer_user_id=user.id if user is not None else None,
        include_subscription_flag=False,
    )

@section_detail_query_router.post('/detail', response_model=schemas.section.SectionInfo)
async def get_section_detail(
    section_detail_request: schemas.section.SectionDetailRequest,
    user: models.user.User = Depends(get_current_user_without_throw),
    db: Session = Depends(get_db)
):
    db_section = crud.section.get_section_by_section_id(
        db=db,
        section_id=section_detail_request.section_id
    )
    if db_section is None:
        raise schemas.error.CustomException("Section not found", code=404)

    db_users = crud.section.get_users_for_section_by_section_id(
        db=db,
        section_id=section_detail_request.section_id,
        filter_roles=[UserSectionRole.MEMBER, UserSectionRole.CREATOR]
    )

    db_publish_section = crud.section.get_publish_section_by_section_id(
        db=db,
        section_id=section_detail_request.section_id
    )
    if db_publish_section is None:
        ensure_private_section_access(
            user_id=user.id if user is not None else None,
            member_user_ids=[db_user.id for db_user in db_users],
        )

    res = await _build_section_info_response(
        db=db,
        db_section=db_section,
        section_id=section_detail_request.section_id,
        viewer_user_id=user.id if user is not None else None,
        include_subscription_flag=True,
    )
    db_section_process_trigger_type = crud.task.get_section_process_task_by_section_id(
        db=db,
        section_id=section_detail_request.section_id
    )
    if db_section_process_trigger_type is not None:
        res.process_task_trigger_type = db_section_process_trigger_type.trigger_type
        db_section_process_trigger_scheduler = crud.task.get_section_process_trigger_scheduler_by_section_id(
            db=db,
            section_id=section_detail_request.section_id
        )
        if db_section_process_trigger_scheduler is not None:
            _, cron_expr = decode_cron_expr_with_timezone(
                db_section_process_trigger_scheduler.cron_expr
            )
            res.process_task_trigger_scheduler = cron_expr
    return res

@section_detail_query_router.post('/date', response_model=schemas.section.DaySectionResponse)
async def get_date_section_info(
    day_section_request: schemas.section.DaySectionRequest,
    db: Session = Depends(get_db),
    user: models.user.User = Depends(get_current_user)
):
    date = datetime.strptime(day_section_request.date, "%Y-%m-%d").date()
    db_section = crud.section.get_section_by_user_and_date(
        db=db,
        user_id=user.id,
        date=date
    )
    if db_section is None:
        raise schemas.error.CustomException(code=404, message="The summary section of this day is not created yet")

    db_documents = crud.section.get_documents_for_section_by_section_id(
        db=db,
        section_id=db_section.id
    )
    section_docs = crud.section.get_section_documents_by_section_id(
        db=db,
        section_id=db_section.id
    )
    status_map = { sd.document_id: sd.status for sd in section_docs }

    # 生成结果列表
    documents = [
        schemas.section.SectionDocumentInfo.model_validate({
            **document.__dict__,
            'title': document.title or 'Unnamed document',
            'status': status_map.get(document.id)
        })
        for document in db_documents
    ]

    res = schemas.section.DaySectionResponse(
        section_id=db_section.id,
        creator=db_section.creator,
        create_time=db_section.create_time,
        update_time=db_section.update_time,
        date=day_section_request.date,
        title=db_section.title,
        description=db_section.description,
        md_file_name=db_section.md_file_name,
        documents=documents
    )
    if res.md_file_name is not None:
        res.md_file_name = await get_remote_file_signed_url(
            user_id=user.id,
            file_name=res.md_file_name
        )

    db_section_podcast_task = crud.task.get_section_podcast_task_by_section_id(
        db=db,
        section_id=db_section.id,
    )
    if db_section_podcast_task is not None:
        res.podcast_task = schemas.section.SectionPodcastTask(
            status=db_section_podcast_task.status,
            podcast_file_name=db_section_podcast_task.podcast_file_name,
        )
        if db_section_podcast_task.podcast_file_name is not None:
            res.podcast_task.podcast_file_name = await get_remote_file_signed_url(
                user_id=db_section_podcast_task.user_id,
                file_name=db_section_podcast_task.podcast_file_name,
            )

    db_section_process_task = crud.task.get_section_process_task_by_section_id(
        db=db,
        section_id=db_section.id,
    )
    if db_section_process_task is not None:
        res.process_task = schemas.section.SectionProcessTask(
            status=db_section_process_task.status,
        )

    return res
