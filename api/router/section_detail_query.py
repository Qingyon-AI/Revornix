import json
from datetime import datetime

from fastapi import APIRouter, Depends
from fastapi.responses import PlainTextResponse
from sqlalchemy.ext.asyncio import AsyncSession

import crud
import models
import schemas
from common.dependencies import (
    get_async_db,
    get_current_user,
    get_current_user_without_throw,
)
from common.file import get_remote_file_signed_urls
from proxy.file_system_proxy import FileSystemProxy
from common.section_defaults import (
    TODAY_SECTION_DEFAULT_AUTO_ILLUSTRATION,
    TODAY_SECTION_DEFAULT_AUTO_PODCAST,
    TODAY_SECTION_DEFAULT_PROCESS_CRON,
)
from common.timezone import decode_cron_expr_with_timezone
from enums.document import DocumentGraphStatus, DocumentProcessStatus
from enums.section import (
    SectionDocumentIntegration,
    SectionProcessTriggerType,
    UserSectionAuthority,
    UserSectionRole,
)
from router.logic_helpers import ensure_private_section_access

section_detail_query_router = APIRouter()


def _get_section_ppt_manifest_path(section_id: int) -> str:
    return f"generated/sections/{section_id}/ppt/manifest.json"


async def _batch_sign_remote_fields(
    items: list[tuple[object, str, int]],
) -> None:
    valid_items = [
        (item, field_name, user_id)
        for item, field_name, user_id in items
        if item is not None and getattr(item, field_name) is not None
    ]
    if not valid_items:
        return
    signed_urls = await get_remote_file_signed_urls(
        [
            (user_id, getattr(item, field_name))
            for item, field_name, user_id in valid_items
        ]
    )
    for (item, field_name, _), signed_url in zip(valid_items, signed_urls, strict=False):
        setattr(item, field_name, signed_url)


async def _get_section_ppt_preview(
    *,
    user_id: int,
    section_id: int,
) -> schemas.section.SectionPptPreview | None:
    manifest_path = _get_section_ppt_manifest_path(section_id)
    try:
        remote_file_service = await FileSystemProxy.create(user_id=user_id)
        raw_content = await remote_file_service.get_file_content_by_file_path(manifest_path)
    except Exception:
        return None

    try:
        if isinstance(raw_content, bytes):
            manifest = json.loads(raw_content.decode("utf-8"))
        else:
            manifest = json.loads(raw_content)
    except Exception:
        return None

    if not isinstance(manifest, dict):
        return None

    slides_payload = manifest.get("slides") or []
    slides: list[schemas.section.SectionPptSlide] = []
    pptx_url = None
    pptx_file_name = manifest.get("pptx_file_name")
    for slide in slides_payload:
        if not isinstance(slide, dict):
            continue
        image_file_name = slide.get("image_file_name")
        try:
            slides.append(
                schemas.section.SectionPptSlide(
                    id=str(slide.get("id") or ""),
                    title=str(slide.get("title") or ""),
                    summary=str(slide.get("summary") or ""),
                    prompt=str(slide.get("prompt") or ""),
                    image_url=image_file_name if isinstance(image_file_name, str) and image_file_name.strip() else None,
                )
            )
        except Exception:
            continue

    sign_targets: list[tuple[object, str, int]] = []
    if isinstance(pptx_file_name, str) and pptx_file_name.strip():
        sign_target = type("SectionPptSignTarget", (), {"pptx_url": pptx_file_name})()
        sign_targets.append((sign_target, "pptx_url", user_id))
    else:
        sign_target = None
    sign_targets.extend((slide, "image_url", user_id) for slide in slides)
    try:
        await _batch_sign_remote_fields(sign_targets)
        if sign_target is not None:
            pptx_url = sign_target.pptx_url
    except Exception:
        pptx_url = None
        for slide in slides:
            slide.image_url = None

    return schemas.section.SectionPptPreview(
        status=str(manifest.get("status") or "unknown"),
        title=manifest.get("title"),
        subtitle=manifest.get("subtitle"),
        theme_prompt=manifest.get("theme_prompt"),
        pptx_url=pptx_url,
        error_message=manifest.get("error_message"),
        create_time=manifest.get("create_time"),
        update_time=manifest.get("update_time"),
        slides=slides,
    )


def _get_task_time(task) -> datetime | None:
    if task is None:
        return None
    return task.update_time or task.create_time


async def _is_section_graph_stale(
    *,
    db: AsyncSession,
    document_ids: list[int],
) -> bool:
    if not document_ids:
        return False

    graph_task_by_document_id = {
        task.document_id: task
        for task in await crud.task.get_document_graph_tasks_by_document_ids_async(
            db=db,
            document_ids=document_ids,
        )
    }
    process_task_by_document_id = {
        task.document_id: task
        for task in await crud.task.get_document_process_tasks_by_document_ids_async(
            db=db,
            document_ids=document_ids,
        )
    }

    for document_id in document_ids:
        graph_task = graph_task_by_document_id.get(document_id)
        if graph_task is None or graph_task.status != DocumentGraphStatus.SUCCESS:
            return True

        process_task = process_task_by_document_id.get(document_id)
        if process_task is None or process_task.status == DocumentProcessStatus.SUCCESS:
            continue

        graph_time = _get_task_time(graph_task)
        process_time = _get_task_time(process_task)
        if graph_time is not None and process_time is not None and process_time > graph_time:
            return True

    return False


async def _build_section_info_response(
    *,
    db: AsyncSession,
    db_section: models.section.Section,
    section_id: int,
    viewer_user_id: int | None,
    include_subscription_flag: bool,
    include_process_trigger_metadata: bool = False,
) -> schemas.section.SectionInfo:
    documents_count = await crud.section.count_documents_for_section_by_section_id_async(
        db=db,
        section_id=db_section.id,
    )
    db_publish_section = await crud.section.get_publish_section_by_section_id_async(
        db=db,
        section_id=section_id,
    )
    subscribers_count = await crud.section.count_users_for_section_by_section_id_async(
        db=db,
        section_id=db_section.id,
        filter_roles=[UserSectionRole.SUBSCRIBER],
    )
    db_labels = await crud.section.get_labels_by_section_id_async(
        db=db,
        section_id=section_id,
    )
    db_section_documents = await crud.section.get_section_documents_by_section_id_async(
        db=db,
        section_id=section_id,
    )
    db_day_section = await crud.section.get_day_section_by_section_id_async(
        db=db,
        section_id=section_id,
    )
    document_ids = [item.document_id for item in db_section_documents]
    labels = [schemas.section.SectionLabel(id=db_label.id, name=db_label.name) for db_label in db_labels]
    document_integration = schemas.section.SectionDocumentIntegrationSummary(
        wait_to_count=sum(
            1
            for item in db_section_documents
            if item.status == SectionDocumentIntegration.WAIT_TO
        ),
        supplementing_count=sum(
            1
            for item in db_section_documents
            if item.status == SectionDocumentIntegration.SUPPLEMENTING
        ),
        success_count=sum(
            1
            for item in db_section_documents
            if item.status == SectionDocumentIntegration.SUCCESS
        ),
        failed_count=sum(
            1
            for item in db_section_documents
            if item.status == SectionDocumentIntegration.FAILED
        ),
    )

    res = schemas.section.SectionInfo(
        **db_section.__dict__,
        labels=labels,
        documents_count=documents_count,
        subscribers_count=subscribers_count,
        document_integration=document_integration,
        is_day_section=db_day_section is not None,
        day_section_date=db_day_section.date.isoformat() if db_day_section is not None else None,
        graph_stale=await _is_section_graph_stale(
            db=db,
            document_ids=document_ids,
        ),
    )
    res.publish_uuid = db_publish_section.uuid if db_publish_section is not None else None

    if res.md_file_name is not None:
        await _batch_sign_remote_fields([(res, "md_file_name", res.creator.id)])

    db_section_podcast_task = await crud.task.get_section_podcast_task_by_section_id_async(
        db=db,
        section_id=section_id,
    )
    if db_section_podcast_task is not None:
        res.podcast_task = schemas.section.SectionPodcastTask(
            status=db_section_podcast_task.status,
            podcast_file_name=db_section_podcast_task.podcast_file_name,
            podcast_script_file_name=db_section_podcast_task.podcast_script_file_name,
            create_time=db_section_podcast_task.create_time,
            update_time=db_section_podcast_task.update_time,
        )
        await _batch_sign_remote_fields([
            (res.podcast_task, "podcast_file_name", db_section_podcast_task.user_id),
            (res.podcast_task, "podcast_script_file_name", db_section_podcast_task.user_id),
        ])

    db_section_process_task = await crud.task.get_section_process_task_by_section_id_async(
        db=db,
        section_id=section_id,
    )
    if db_section_process_task is not None:
        res.process_task = schemas.section.SectionProcessTask(
            status=db_section_process_task.status,
            create_time=db_section_process_task.create_time,
            update_time=db_section_process_task.update_time,
        )
        if include_process_trigger_metadata:
            res.process_task_trigger_type = db_section_process_task.trigger_type
            db_section_process_trigger_scheduler = await crud.task.get_section_process_trigger_scheduler_by_section_id_async(
                db=db,
                section_id=section_id,
            )
            if db_section_process_trigger_scheduler is not None:
                _, cron_expr = decode_cron_expr_with_timezone(
                    db_section_process_trigger_scheduler.cron_expr
                )
                res.process_task_trigger_scheduler = cron_expr
    elif include_process_trigger_metadata:
        res.process_task_trigger_type = SectionProcessTriggerType.UPDATED

    if viewer_user_id is not None:
        db_section_user = await crud.section.get_section_user_by_section_id_and_user_id_async(
            db=db,
            section_id=section_id,
            user_id=viewer_user_id,
        )
        if db_section_user is not None:
            res.authority = UserSectionAuthority(db_section_user.authority)
            if include_subscription_flag and db_section_user.role == UserSectionRole.SUBSCRIBER:
                res.is_subscribed = True

    res.ppt_preview = await _get_section_ppt_preview(
        user_id=db_section.creator_id,
        section_id=section_id,
    )

    return res


@section_detail_query_router.post('/documents', response_model=schemas.pagination.InifiniteScrollPagnition[schemas.section.SectionDocumentInfo])
async def section_document_request(
    section_document_request: schemas.section.SectionDocumentRequest,
    db: AsyncSession = Depends(get_async_db),
    user: models.user.User = Depends(get_current_user_without_throw),
):
    db_section = await crud.section.get_section_by_section_id_async(
        db=db,
        section_id=section_document_request.section_id
    )
    if db_section is None:
        raise schemas.error.CustomException("Section not found", code=404)

    db_publish_section = await crud.section.get_publish_section_by_section_id_async(
        db=db,
        section_id=section_document_request.section_id,
    )
    db_member_users = await crud.section.get_users_for_section_by_section_id_async(
        db=db,
        section_id=section_document_request.section_id,
        filter_roles=[UserSectionRole.MEMBER, UserSectionRole.CREATOR],
    )
    member_user_ids = [db_user.id for db_user in db_member_users]
    has_member_access = user is not None and user.id in member_user_ids
    if db_publish_section is None:
        ensure_private_section_access(
            user_id=user.id if user is not None else None,
            member_user_ids=member_user_ids,
        )

    has_more = False
    next_start = None
    published_only = db_publish_section is not None and not has_member_access
    db_documents = await crud.document.search_section_documents_async(
        db=db,
        section_id=section_document_request.section_id,
        start=section_document_request.start,
        limit=section_document_request.limit,
        keyword=section_document_request.keyword,
        desc=section_document_request.desc,
        published_only=published_only,
    )

    document_ids = [document.id for document in db_documents]
    labels_by_document_id = await crud.document.get_labels_by_document_ids_async(
        db=db,
        document_ids=document_ids
    )
    section_documents = await crud.section.get_section_documents_by_section_id_and_document_ids_async(
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
        next_document = await crud.document.search_next_section_document_async(
            db=db,
            section_id=section_document_request.section_id,
            document=db_documents[-1],
            keyword=section_document_request.keyword,
            desc=section_document_request.desc,
            published_only=published_only,
        )
        has_more = next_document is not None
        next_start = next_document.id if next_document is not None else None
    total = await crud.document.count_section_documents_async(
        db=db,
        section_id=section_document_request.section_id,
        keyword=section_document_request.keyword,
        published_only=published_only,
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
    db: AsyncSession = Depends(get_async_db),
    user: models.user.User = Depends(get_current_user_without_throw),
):
    db_section_publish = await crud.section.get_publish_sections_by_uuid_async(
        db=db,
        uuid=section_seo_detail_request.uuid
    )

    if db_section_publish is None:
        raise schemas.error.CustomException("Section is not published", code=404)

    db_section = await crud.section.get_section_by_section_id_async(
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
    db: AsyncSession = Depends(get_async_db),
):
    db_section = await crud.section.get_section_by_section_id_async(
        db=db,
        section_id=section_detail_request.section_id
    )
    if db_section is None:
        raise schemas.error.CustomException("Section not found", code=404)

    db_users = await crud.section.get_users_for_section_by_section_id_async(
        db=db,
        section_id=section_detail_request.section_id,
        filter_roles=[UserSectionRole.MEMBER, UserSectionRole.CREATOR]
    )

    db_publish_section = await crud.section.get_publish_section_by_section_id_async(
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
        include_process_trigger_metadata=True,
    )
    return res


@section_detail_query_router.post('/markdown/content', response_class=PlainTextResponse)
async def get_section_markdown_content(
    section_detail_request: schemas.section.SectionDetailRequest,
    user: models.user.User = Depends(get_current_user_without_throw),
    db: AsyncSession = Depends(get_async_db),
):
    db_section = await crud.section.get_section_by_section_id_async(
        db=db,
        section_id=section_detail_request.section_id
    )
    if db_section is None:
        raise schemas.error.CustomException("Section not found", code=404)

    db_users = await crud.section.get_users_for_section_by_section_id_async(
        db=db,
        section_id=section_detail_request.section_id,
        filter_roles=[UserSectionRole.MEMBER, UserSectionRole.CREATOR]
    )
    db_publish_section = await crud.section.get_publish_section_by_section_id_async(
        db=db,
        section_id=section_detail_request.section_id
    )
    if db_publish_section is None:
        ensure_private_section_access(
            user_id=user.id if user is not None else None,
            member_user_ids=[db_user.id for db_user in db_users],
        )

    if db_section.md_file_name is None:
        raise schemas.error.CustomException("Section markdown is not ready", code=404)

    remote_file_service = await FileSystemProxy.create(user_id=db_section.creator_id)
    raw_content = await remote_file_service.get_file_content_by_file_path(
        file_path=db_section.md_file_name
    )
    if isinstance(raw_content, bytes):
        return PlainTextResponse(content=raw_content.decode("utf-8"))
    return PlainTextResponse(content=raw_content)


@section_detail_query_router.post('/detail/seo/markdown/content', response_class=PlainTextResponse)
async def get_seo_section_markdown_content(
    section_seo_detail_request: schemas.section.SectionSeoDetailRequest,
    user: models.user.User = Depends(get_current_user_without_throw),
    db: AsyncSession = Depends(get_async_db),
):
    db_publish_section = await crud.section.get_publish_section_by_uuid_async(
        db=db,
        uuid=section_seo_detail_request.uuid,
    )
    if db_publish_section is None:
        raise schemas.error.CustomException("Published section not found", code=404)

    db_section = await crud.section.get_section_by_section_id_async(
        db=db,
        section_id=db_publish_section.section_id,
    )
    if db_section is None:
        raise schemas.error.CustomException("Section not found", code=404)
    if db_section.md_file_name is None:
        raise schemas.error.CustomException("Section markdown is not ready", code=404)

    remote_file_service = await FileSystemProxy.create(user_id=db_section.creator_id)
    raw_content = await remote_file_service.get_file_content_by_file_path(
        file_path=db_section.md_file_name
    )
    if isinstance(raw_content, bytes):
        return PlainTextResponse(content=raw_content.decode("utf-8"))
    return PlainTextResponse(content=raw_content)

@section_detail_query_router.post('/date', response_model=schemas.section.DaySectionResponse)
async def get_date_section_info(
    day_section_request: schemas.section.DaySectionRequest,
    db: AsyncSession = Depends(get_async_db),
    user: models.user.User = Depends(get_current_user)
):
    date = datetime.strptime(day_section_request.date, "%Y-%m-%d").date()
    db_section = await crud.section.get_section_by_user_and_date_async(
        db=db,
        user_id=user.id,
        date=date
    )
    if db_section is None:
        return schemas.section.DaySectionResponse(
            section_id=None,
            creator=None,
            date=day_section_request.date,
            title=None,
            description=None,
            auto_podcast=TODAY_SECTION_DEFAULT_AUTO_PODCAST,
            auto_illustration=TODAY_SECTION_DEFAULT_AUTO_ILLUSTRATION,
            create_time=None,
            update_time=None,
            md_file_name=None,
            documents=[],
            podcast_task=None,
            process_task=None,
            process_task_trigger_type=SectionProcessTriggerType.SCHEDULER,
            process_task_trigger_scheduler=TODAY_SECTION_DEFAULT_PROCESS_CRON,
            is_created=False,
        )

    db_documents = await crud.section.get_documents_for_section_by_section_id_async(
        db=db,
        section_id=db_section.id
    )
    section_docs = await crud.section.get_section_documents_by_section_id_async(
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
        auto_podcast=db_section.auto_podcast,
        auto_illustration=db_section.auto_illustration,
        md_file_name=db_section.md_file_name,
        documents=documents,
        is_created=True,
    )
    if res.md_file_name is not None:
        await _batch_sign_remote_fields([(res, "md_file_name", user.id)])

    db_section_podcast_task = await crud.task.get_section_podcast_task_by_section_id_async(
        db=db,
        section_id=db_section.id,
    )
    if db_section_podcast_task is not None:
        res.podcast_task = schemas.section.SectionPodcastTask(
            status=db_section_podcast_task.status,
            podcast_file_name=db_section_podcast_task.podcast_file_name,
            podcast_script_file_name=db_section_podcast_task.podcast_script_file_name,
            create_time=db_section_podcast_task.create_time,
            update_time=db_section_podcast_task.update_time,
        )
        await _batch_sign_remote_fields([
            (res.podcast_task, "podcast_file_name", db_section_podcast_task.user_id),
            (res.podcast_task, "podcast_script_file_name", db_section_podcast_task.user_id),
        ])

    db_section_process_task = await crud.task.get_section_process_task_by_section_id_async(
        db=db,
        section_id=db_section.id,
    )
    if db_section_process_task is not None:
        res.process_task = schemas.section.SectionProcessTask(
            status=db_section_process_task.status,
            create_time=db_section_process_task.create_time,
            update_time=db_section_process_task.update_time,
        )
        res.process_task_trigger_type = db_section_process_task.trigger_type
        db_section_process_trigger_scheduler = await crud.task.get_section_process_trigger_scheduler_by_section_id_async(
            db=db,
            section_id=db_section.id,
        )
        if db_section_process_trigger_scheduler is not None:
            _, cron_expr = decode_cron_expr_with_timezone(
                db_section_process_trigger_scheduler.cron_expr
            )
            res.process_task_trigger_scheduler = cron_expr
    else:
        res.process_task_trigger_type = SectionProcessTriggerType.SCHEDULER
        res.process_task_trigger_scheduler = TODAY_SECTION_DEFAULT_PROCESS_CRON

    return res
