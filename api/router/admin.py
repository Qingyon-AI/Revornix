from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from uuid import uuid4

from fastapi import APIRouter, Depends, File, Form, UploadFile
import httpx
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

import crud
import models
import schemas
from common.dependencies import get_async_db, get_current_user
from common.jwt_utils import create_token
from common.document_chunk_snapshot import delete_document_chunk_snapshots
from common.resource_plan_access import is_privileged_user
from common.upload_limits import validate_file_upload_size
from config.base import UNION_PAY_API_PREFIX
from data.milvus.delete import delete_documents_from_milvus
from data.neo4j.delete import delete_documents_and_related_from_neo4j
from enums.document import DocumentCategory
from enums.section import UserSectionRole
from enums.user import UserRole
from proxy.file_system_proxy import FileSystemProxy
from router.notification_task_manage import (
    _build_notification_task_response,
    _sync_notification_task_event_configuration,
    _validate_notification_source_target_pair,
)
from router.logic_helpers import group_document_ids_by_category
from router.section_detail_query import _build_section_info_response
from router.user import _batch_sign_user_avatars
from router.user_shared import (
    commit_with_bucket_cleanup_async,
    setup_default_file_system_for_user_async,
)
from common.celery.app import start_trigger_user_notification_event
from enums.notification import NotificationTriggerEventUUID
from config.base import GATEWAY_INTERNAL_URL

admin_router = APIRouter()


def _ensure_privileged_user(user: models.user.User) -> None:
    if not is_privileged_user(user):
        raise schemas.error.CustomException(
            message="Only administrators or root users can access admin APIs.",
            code=403,
        )


def _ensure_manageable_user(
    *,
    operator: models.user.User,
    target_user: models.user.User | None = None,
    target_role: int | None = None,
):
    role = target_user.role if target_user is not None else target_role
    if role is None:
        return

    if operator.role == UserRole.ROOT:
        return

    if role in (UserRole.ADMIN, UserRole.ROOT):
        raise schemas.error.CustomException(
            message="Administrators can only manage normal users.",
            code=403,
        )


async def _fetch_gateway_anti_scrape_stats() -> schemas.admin.AdminAntiScrapeStatsResponse:
    url = f"{GATEWAY_INTERNAL_URL.rstrip('/')}/gateway/anti-scrape"
    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.get(url)
    if not response.is_success:
        raise schemas.error.CustomException(
            message="Failed to fetch gateway anti-scrape stats.",
            code=response.status_code,
        )
    payload = response.json()
    anti_scrape_payload = payload.get("antiScrape") if isinstance(payload, dict) else None
    if not isinstance(anti_scrape_payload, dict):
        raise schemas.error.CustomException(
            message="Invalid gateway anti-scrape stats response.",
            code=502,
        )
    return schemas.admin.AdminAntiScrapeStatsResponse.model_validate(anti_scrape_payload)


async def _request_target_user_compute_payload(
    *,
    db_user: models.user.User,
    endpoint: str,
    payload: dict[str, Any] | None = None,
) -> dict[str, Any]:
    access_token, _ = create_token(user=db_user)
    headers = {
        "Authorization": f"Bearer {access_token}",
    }
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{UNION_PAY_API_PREFIX}{endpoint}",
            headers=headers,
            json=payload,
        )
    if not response.is_success:
        raise schemas.error.CustomException(
            message="Failed to fetch user compute data.",
            code=response.status_code,
        )
    data = response.json()
    if not isinstance(data, dict):
        raise schemas.error.CustomException(
            message="Invalid compute service response.",
            code=502,
        )
    return data


async def _build_admin_document_detail(
    *,
    db: AsyncSession,
    document: models.document.Document,
) -> schemas.admin.AdminDocumentDetailResponse:
    document_id = document.id
    db_sections = await crud.document.get_sections_by_document_id_async(
        db=db,
        document_id=document_id,
    )
    publish_sections = await crud.section.get_publish_sections_by_section_ids_async(
        db=db,
        section_ids=[section.id for section in db_sections],
    )
    publish_uuid_by_section_id = {
        item.section_id: item.uuid for item in publish_sections
    }
    sections = [
        schemas.document.BaseSectionInfo(
            id=section.id,
            title=section.title,
            description=section.description,
            publish_uuid=publish_uuid_by_section_id.get(section.id),
        )
        for section in db_sections
    ]
    db_labels = await crud.document.get_labels_by_document_id_async(
        db=db,
        document_id=document_id,
    )
    labels = [
        schemas.document.DocumentLabel(
            id=label.id,
            name=label.name,
        )
        for label in db_labels
    ]
    res = schemas.admin.AdminDocumentDetailResponse(
        id=document.id,
        labels=labels,
        sections=sections,
        title=document.title,
        category=document.category,
        description=document.description,
        creator=document.creator,
        cover=document.cover,
        from_plat=document.from_plat,
        create_time=document.create_time,
        update_time=document.update_time,
        is_star=False,
        is_read=False,
    )
    if document.category == DocumentCategory.WEBSITE:
        website_document = await crud.document.get_website_document_by_document_id_async(
            db=db,
            document_id=document_id,
        )
        website_snapshots = await crud.document.get_website_document_snapshots_by_document_id_async(
            db=db,
            document_id=document_id,
        )
        if website_document is not None:
            res.website_info = schemas.document.WebsiteDocumentInfo(
                url=website_document.url,
                latest_snapshot_time=website_snapshots[0].create_time if website_snapshots else None,
                snapshot_count=len(website_snapshots),
            )
        res.website_snapshots = [
            schemas.document.WebsiteDocumentSnapshotInfo.model_validate(snapshot)
            for snapshot in website_snapshots
        ]
    elif document.category == DocumentCategory.FILE:
        file_document = await crud.document.get_file_document_by_document_id_async(
            db=db,
            document_id=document_id,
        )
        if file_document is not None:
            res.file_info = schemas.document.FileDocumentInfo(
                file_name=file_document.file_name,
            )
    elif document.category == DocumentCategory.QUICK_NOTE:
        quick_note_document = await crud.document.get_quick_note_document_by_document_id_async(
            db=db,
            document_id=document_id,
        )
        if quick_note_document is not None:
            res.quick_note_info = schemas.document.QuickNoteDocumentInfo(
                content=quick_note_document.content,
            )
    elif document.category == DocumentCategory.AUDIO:
        audio_document = await crud.document.get_audio_document_by_document_id_async(
            db=db,
            document_id=document_id,
        )
        if audio_document is not None:
            res.audio_info = schemas.document.AudioDocumentInfo(
                audio_file_name=audio_document.audio_file_name,
            )
    convert_task = await crud.task.get_document_convert_task_by_document_id_async(
        db=db,
        document_id=document_id,
    )
    if convert_task is not None:
        res.convert_task = schemas.document.DocumentConvertTask(
            status=convert_task.status,
            md_file_name=convert_task.md_file_name,
            create_time=convert_task.create_time,
            update_time=convert_task.update_time,
        )
    podcast_task = await crud.task.get_document_podcast_task_by_document_id_async(
        db=db,
        document_id=document_id,
    )
    if podcast_task is not None:
        res.podcast_task = schemas.document.DocumentPodcastTask(
            status=podcast_task.status,
            podcast_file_name=podcast_task.podcast_file_name,
            podcast_script_file_name=podcast_task.podcast_script_file_name,
            create_time=podcast_task.create_time,
            update_time=podcast_task.update_time,
        )
    summarize_task = await crud.task.get_document_summarize_task_by_document_id_async(
        db=db,
        document_id=document_id,
    )
    if summarize_task is not None:
        res.summarize_task = schemas.document.DocumentSummarizeTask(
            status=summarize_task.status,
            summary=summarize_task.summary,
            create_time=summarize_task.create_time,
            update_time=summarize_task.update_time,
        )
    res.embedding_task = await crud.task.get_document_embedding_task_by_document_id_async(
        db=db,
        document_id=document_id,
    )
    res.graph_task = await crud.task.get_document_graph_task_by_document_id_async(
        db=db,
        document_id=document_id,
    )
    res.transcribe_task = await crud.task.get_document_audio_transcribe_task_by_document_id_async(
        db=db,
        document_id=document_id,
    )
    res.process_task = await crud.task.get_document_process_task_by_document_id_async(
        db=db,
        document_id=document_id,
    )
    return res


async def _delete_user_with_related_resources(
    *,
    db: AsyncSession,
    user: models.user.User,
) -> None:
    removed_from_section_notifications_to_send: list[tuple[int, int]] = []

    db_documents = await crud.document.get_documents_by_user_id_async(
        db=db,
        user_id=user.id,
    )
    document_ids = [document.id for document in db_documents]

    await delete_document_chunk_snapshots(
        db=db,
        documents=db_documents,
    )

    await crud.user.delete_user_by_user_id_async(
        db=db,
        user_id=user.id,
    )
    await crud.user.delete_wechat_user_by_user_id_async(
        db=db,
        user_id=user.id,
    )
    await crud.user.delete_email_user_by_user_id_async(
        db=db,
        user_id=user.id,
    )
    await crud.user.delete_github_user_by_user_id_async(
        db=db,
        user_id=user.id,
    )
    await crud.user.delete_google_user_by_user_id_async(
        db=db,
        user_id=user.id,
    )
    await crud.user.delete_phone_user_by_user_id_async(
        db=db,
        user_id=user.id,
    )

    await crud.task.cancel_document_tasks_by_document_ids_async(
        db=db,
        document_ids=document_ids,
    )
    await crud.document.delete_user_documents_by_document_ids_async(
        db=db,
        document_ids=document_ids,
        user_id=user.id,
    )
    await crud.document.delete_document_labels_by_document_ids_async(
        db=db,
        document_ids=document_ids,
    )
    await crud.document.delete_document_notes_by_document_ids_async(
        db=db,
        document_ids=document_ids,
    )

    grouped_document_ids = group_document_ids_by_category(db_documents)
    file_document_ids = grouped_document_ids.get(DocumentCategory.FILE, [])
    website_document_ids = grouped_document_ids.get(DocumentCategory.WEBSITE, [])
    quick_note_document_ids = grouped_document_ids.get(DocumentCategory.QUICK_NOTE, [])
    audio_document_ids = grouped_document_ids.get(DocumentCategory.AUDIO, [])

    if file_document_ids:
        await crud.document.delete_file_documents_by_document_ids_async(
            db=db,
            document_ids=file_document_ids,
        )
    if website_document_ids:
        await crud.document.delete_website_documents_by_document_ids_async(
            db=db,
            document_ids=website_document_ids,
        )
    if quick_note_document_ids:
        await crud.document.delete_quick_note_documents_by_document_ids_async(
            db=db,
            document_ids=quick_note_document_ids,
        )
    if audio_document_ids:
        await crud.document.delete_audio_documents_by_document_ids_async(
            db=db,
            document_ids=audio_document_ids,
        )

    delete_documents_and_related_from_neo4j(doc_ids=document_ids)
    delete_documents_from_milvus(doc_ids=document_ids)

    db_sections = await crud.section.get_sections_by_user_id_async(
        db=db,
        user_id=user.id,
    )
    for db_section in db_sections:
        db_users = await crud.section.get_users_for_section_by_section_id_async(
            db=db,
            section_id=db_section.id,
            filter_roles=[UserSectionRole.MEMBER, UserSectionRole.SUBSCRIBER],
        )
        await crud.section.delete_section_users_by_section_id_async(
            db=db,
            section_id=db_section.id,
        )
        await crud.section.delete_section_documents_by_section_id_async(
            db=db,
            section_id=db_section.id,
        )
        await crud.section.delete_section_labels_by_section_id_async(
            db=db,
            section_id=db_section.id,
        )
        await crud.section.delete_section_comments_by_section_id_async(
            db=db,
            section_id=db_section.id,
        )
        await crud.section.delete_section_by_section_id_async(
            db=db,
            section_id=db_section.id,
        )
        for db_user in db_users:
            if db_user.id != user.id:
                removed_from_section_notifications_to_send.append((db_user.id, db_section.id))

    await db.commit()
    for target_user_id, section_id in removed_from_section_notifications_to_send:
        start_trigger_user_notification_event.delay(
            user_id=target_user_id,
            trigger_event_uuid=NotificationTriggerEventUUID.REMOVED_FROM_SECTION.value,
            params={
                "section_id": section_id,
                "user_id": target_user_id,
            },
        )


@admin_router.post(
    "/security/anti-scrape",
    response_model=schemas.admin.AdminAntiScrapeStatsResponse,
)
async def get_admin_anti_scrape_stats(
    _request: schemas.admin.AdminAntiScrapeStatsRequest,
    user: models.user.User = Depends(get_current_user),
):
    _ensure_privileged_user(user)
    return await _fetch_gateway_anti_scrape_stats()


@admin_router.post(
    "/users/search",
    response_model=schemas.pagination.Pagination[schemas.admin.AdminUserSummary],
)
async def search_admin_users(
    search_request: schemas.admin.AdminUserSearchRequest,
    db: AsyncSession = Depends(get_async_db),
    user: models.user.User = Depends(get_current_user),
):
    _ensure_privileged_user(user)

    filters = [models.user.User.delete_at.is_(None)]

    keyword = search_request.keyword.strip() if search_request.keyword else None
    if keyword:
        filters.append(
            or_(
                models.user.User.nickname.like(f"%{keyword}%"),
                models.user.User.uuid.like(f"%{keyword}%"),
                models.user.EmailUser.email.like(f"%{keyword}%"),
            )
        )
    if search_request.role is not None:
        filters.append(models.user.User.role == search_request.role)
    if search_request.is_forbidden is not None:
        filters.append(models.user.User.is_forbidden == search_request.is_forbidden)

    query = (
        select(
            models.user.User,
            models.user.EmailUser.email,
            models.user.PhoneUser.phone,
        )
        .outerjoin(
            models.user.EmailUser,
            (models.user.EmailUser.user_id == models.user.User.id)
            & models.user.EmailUser.delete_at.is_(None),
        )
        .outerjoin(
            models.user.PhoneUser,
            (models.user.PhoneUser.user_id == models.user.User.id)
            & models.user.PhoneUser.delete_at.is_(None),
        )
        .where(*filters)
    )
    total = int(
        (
            await db.execute(
                select(func.count(func.distinct(models.user.User.id)))
                .select_from(models.user.User)
                .outerjoin(
                    models.user.EmailUser,
                    (models.user.EmailUser.user_id == models.user.User.id)
                    & models.user.EmailUser.delete_at.is_(None),
                )
                .outerjoin(
                    models.user.PhoneUser,
                    (models.user.PhoneUser.user_id == models.user.User.id)
                    & models.user.PhoneUser.delete_at.is_(None),
                )
                .where(*filters)
            )
        ).scalar()
        or 0
    )

    rows = list(
        (
            await db.execute(
                query.order_by(models.user.User.id.desc())
                .offset((search_request.page_num - 1) * search_request.page_size)
                .limit(search_request.page_size)
            )
        ).all()
    )

    users = [row[0] for row in rows]
    user_ids = [item.id for item in users]
    fans_by_user_id = await crud.user.count_user_fans_by_user_ids_async(db=db, user_ids=user_ids)
    follows_by_user_id = await crud.user.count_user_follows_by_user_ids_async(db=db, user_ids=user_ids)

    items: list[schemas.admin.AdminUserSummary] = []
    for db_user, email, phone in rows:
        items.append(
            schemas.admin.AdminUserSummary(
                id=db_user.id,
                uuid=db_user.uuid,
                role=db_user.role,
                avatar=db_user.avatar,
                nickname=db_user.nickname,
                slogan=db_user.slogan,
                email=email,
                phone=phone,
                is_forbidden=db_user.is_forbidden,
                fans=fans_by_user_id.get(db_user.id, 0),
                follows=follows_by_user_id.get(db_user.id, 0),
                create_time=db_user.create_time,
                update_time=db_user.update_time,
            )
        )

    await _batch_sign_user_avatars(users=items)
    total_pages = (
        (total + search_request.page_size - 1) // search_request.page_size
        if search_request.page_size > 0
        else 0
    )
    return schemas.pagination.Pagination(
        total_elements=total,
        current_page_elements=len(items),
        total_pages=total_pages,
        page_num=search_request.page_num,
        page_size=search_request.page_size,
        elements=items,
    )


@admin_router.post("/users/detail", response_model=schemas.admin.AdminUserDetail)
async def get_admin_user_detail(
    detail_request: schemas.admin.AdminUserDetailRequest,
    db: AsyncSession = Depends(get_async_db),
    user: models.user.User = Depends(get_current_user),
):
    _ensure_privileged_user(user)
    db_user = await crud.user.get_user_by_id_async(
        db=db,
        user_id=detail_request.user_id,
    )
    if db_user is None:
        raise schemas.error.CustomException("User not found", code=404)

    email_user = await crud.user.get_email_user_by_user_id_async(db=db, user_id=db_user.id)
    phone_user = await crud.user.get_phone_user_by_user_id_async(db=db, user_id=db_user.id)
    fans_by_user_id = await crud.user.count_user_fans_by_user_ids_async(db=db, user_ids=[db_user.id])
    follows_by_user_id = await crud.user.count_user_follows_by_user_ids_async(db=db, user_ids=[db_user.id])

    return schemas.admin.AdminUserDetail(
        id=db_user.id,
        uuid=db_user.uuid,
        role=db_user.role,
        avatar=db_user.avatar,
        nickname=db_user.nickname,
        slogan=db_user.slogan,
        email=email_user.email if email_user is not None else None,
        phone=phone_user.phone if phone_user is not None else None,
        is_forbidden=db_user.is_forbidden,
        fans=fans_by_user_id.get(db_user.id, 0),
        follows=follows_by_user_id.get(db_user.id, 0),
        create_time=db_user.create_time,
        update_time=db_user.update_time,
        default_user_file_system=db_user.default_user_file_system,
        default_read_mark_reason=db_user.default_read_mark_reason,
        default_document_reader_model_id=db_user.default_document_reader_model_id,
        default_revornix_model_id=db_user.default_revornix_model_id,
        default_file_document_parse_user_engine_id=db_user.default_file_document_parse_user_engine_id,
        default_website_document_parse_user_engine_id=db_user.default_website_document_parse_user_engine_id,
        default_podcast_user_engine_id=db_user.default_podcast_user_engine_id,
        default_audio_transcribe_engine_id=db_user.default_audio_transcribe_engine_id,
        default_image_generate_engine_id=db_user.default_image_generate_engine_id,
        default_ai_interaction_language=db_user.default_ai_interaction_language,
    )


@admin_router.post("/users/create", response_model=schemas.admin.AdminUserDetail)
async def create_admin_user(
    create_request: schemas.admin.AdminUserCreateRequest,
    db: AsyncSession = Depends(get_async_db),
    user: models.user.User = Depends(get_current_user),
):
    _ensure_privileged_user(user)
    _ensure_manageable_user(operator=user, target_role=create_request.role)

    existed_email = await crud.user.get_email_user_by_email_async(db=db, email=create_request.email)
    if existed_email is not None:
        raise schemas.error.CustomException("Email already exists", code=400)

    db_user = await crud.user.create_base_user_async(
        db=db,
        nickname=create_request.nickname.strip(),
        avatar=(create_request.avatar or "files/default_avatar.png").strip(),
        role=create_request.role,
    )
    if create_request.slogan is not None:
        db_user.slogan = create_request.slogan.strip() or None
    await crud.user.create_email_user_async(
        db=db,
        user_id=db_user.id,
        email=create_request.email.strip(),
        password=create_request.password,
        nickname=create_request.nickname.strip(),
    )
    file_service = await setup_default_file_system_for_user_async(
        db=db,
        db_user=db_user,
    )
    await commit_with_bucket_cleanup_async(db=db, file_service=file_service)

    return schemas.admin.AdminUserDetail(
        id=db_user.id,
        uuid=db_user.uuid,
        role=db_user.role,
        avatar=db_user.avatar,
        nickname=db_user.nickname,
        slogan=db_user.slogan,
        email=create_request.email.strip(),
        phone=None,
        is_forbidden=db_user.is_forbidden,
        fans=0,
        follows=0,
        create_time=db_user.create_time,
        update_time=db_user.update_time,
        default_user_file_system=db_user.default_user_file_system,
        default_read_mark_reason=db_user.default_read_mark_reason,
        default_document_reader_model_id=db_user.default_document_reader_model_id,
        default_revornix_model_id=db_user.default_revornix_model_id,
        default_file_document_parse_user_engine_id=db_user.default_file_document_parse_user_engine_id,
        default_website_document_parse_user_engine_id=db_user.default_website_document_parse_user_engine_id,
        default_podcast_user_engine_id=db_user.default_podcast_user_engine_id,
        default_audio_transcribe_engine_id=db_user.default_audio_transcribe_engine_id,
        default_image_generate_engine_id=db_user.default_image_generate_engine_id,
        default_ai_interaction_language=db_user.default_ai_interaction_language,
    )


@admin_router.post("/users/update", response_model=schemas.common.NormalResponse)
async def update_admin_user(
    update_request: schemas.admin.AdminUserUpdateRequest,
    db: AsyncSession = Depends(get_async_db),
    user: models.user.User = Depends(get_current_user),
):
    _ensure_privileged_user(user)

    db_user = await crud.user.get_user_by_id_async(db=db, user_id=update_request.user_id)
    if db_user is None:
        raise schemas.error.CustomException("User not found", code=404)

    _ensure_manageable_user(operator=user, target_user=db_user)

    if user.id == db_user.id and update_request.role is not None and update_request.role != db_user.role:
        raise schemas.error.CustomException("You can't change your own role here", code=400)

    if update_request.role is not None:
        _ensure_manageable_user(operator=user, target_role=update_request.role)
        db_user.role = update_request.role

    if update_request.is_forbidden is not None:
        db_user.is_forbidden = update_request.is_forbidden

    await crud.user.update_user_info_async(
        db=db,
        user_id=db_user.id,
        nickname=update_request.nickname.strip() if update_request.nickname is not None else None,
        slogan=update_request.slogan,
        avatar=update_request.avatar.strip() if update_request.avatar is not None else None,
    )

    email_user = await crud.user.get_email_user_by_user_id_async(db=db, user_id=db_user.id)
    if update_request.email is not None:
        if email_user is None:
            raise schemas.error.CustomException("This user has no email account to update", code=400)
        existed_email = await crud.user.get_email_user_by_email_async(db=db, email=update_request.email.strip())
        if existed_email is not None and existed_email.user_id != db_user.id:
            raise schemas.error.CustomException("Email already exists", code=400)
        email_user.email = update_request.email.strip()
        email_user.nickname = db_user.nickname
    if update_request.password:
        if email_user is None:
            raise schemas.error.CustomException("This user has no email account to update", code=400)
        await crud.user.update_user_password_async(
            db=db,
            user_id=db_user.id,
            password=update_request.password,
        )

    db_user.update_time = datetime.now(timezone.utc)
    await db.commit()
    return schemas.common.SuccessResponse(message="The user is updated successfully.")


@admin_router.post(
    "/users/compute/info",
    response_model=schemas.admin.AdminUserComputeInfoResponse,
)
async def get_admin_user_compute_info(
    compute_info_request: schemas.admin.AdminUserComputeInfoRequest,
    db: AsyncSession = Depends(get_async_db),
    user: models.user.User = Depends(get_current_user),
):
    _ensure_privileged_user(user)
    db_user = await crud.user.get_user_by_id_async(db=db, user_id=compute_info_request.user_id)
    if db_user is None:
        raise schemas.error.CustomException("User not found", code=404)

    payload = await _request_target_user_compute_payload(
        db_user=db_user,
        endpoint="/user/compute/info",
    )
    available_points = payload.get("available_points", 0)
    return schemas.admin.AdminUserComputeInfoResponse(
        available_points=max(int(available_points or 0), 0),
    )


@admin_router.post(
    "/users/compute/ledger",
    response_model=schemas.admin.AdminUserComputeLedgerResponse,
)
async def get_admin_user_compute_ledger(
    compute_ledger_request: schemas.admin.AdminUserComputeLedgerRequest,
    db: AsyncSession = Depends(get_async_db),
    user: models.user.User = Depends(get_current_user),
):
    _ensure_privileged_user(user)
    db_user = await crud.user.get_user_by_id_async(db=db, user_id=compute_ledger_request.user_id)
    if db_user is None:
        raise schemas.error.CustomException("User not found", code=404)

    payload = await _request_target_user_compute_payload(
        db_user=db_user,
        endpoint="/user/compute/ledger",
        payload={
            "page": compute_ledger_request.page,
            "page_size": compute_ledger_request.page_size,
            "direction": compute_ledger_request.direction,
        },
    )

    raw_items = payload.get("items", [])
    items = []
    if isinstance(raw_items, list):
        for item in raw_items:
            if isinstance(item, dict):
                items.append(schemas.admin.AdminUserComputeLedgerItem(**item))

    return schemas.admin.AdminUserComputeLedgerResponse(
        items=items,
        total=int(payload.get("total", 0) or 0),
        page=int(payload.get("page", compute_ledger_request.page) or 0),
        page_size=int(payload.get("page_size", compute_ledger_request.page_size) or compute_ledger_request.page_size),
        has_more=bool(payload.get("has_more", False)),
    )


@admin_router.post(
    "/users/notifications/sources",
    response_model=schemas.pagination.InifiniteScrollPagnition[schemas.notification.NotificationSource],
)
async def search_admin_user_notification_sources(
    search_request: schemas.admin.AdminUserNotificationSourceSearchRequest,
    db: AsyncSession = Depends(get_async_db),
    user: models.user.User = Depends(get_current_user),
):
    _ensure_privileged_user(user)
    db_user = await crud.user.get_user_by_id_async(db=db, user_id=search_request.user_id)
    if db_user is None:
        raise schemas.error.CustomException("User not found", code=404)

    db_notification_sources = await crud.notification.search_notification_sources_for_user_async(
        db=db,
        user_id=db_user.id,
        keyword=search_request.keyword,
        start=search_request.start,
        limit=search_request.limit,
    )
    total = await crud.notification.count_all_notification_sources_for_user_async(
        db=db,
        user_id=db_user.id,
        keyword=search_request.keyword,
    )
    has_more = False
    next_start = None
    if search_request.limit > 0 and len(db_notification_sources) == search_request.limit:
        next_notification_source = await crud.notification.search_next_notification_source_for_user_async(
            db=db,
            user_id=db_user.id,
            notification_source=db_notification_sources[-1][0],
            keyword=search_request.keyword,
        )
        has_more = next_notification_source is not None
        next_start = next_notification_source[0].id if next_notification_source is not None else None

    data = [
        schemas.notification.NotificationSource.model_validate(
            {
                **schemas.notification.NotificationSource.model_validate(item[0]).model_dump(),
                "is_forked": False,
            }
        )
        for item in db_notification_sources
    ]
    return schemas.pagination.InifiniteScrollPagnition(
        total=total,
        elements=data,
        start=search_request.start,
        limit=search_request.limit,
        has_more=has_more,
        next_start=next_start,
    )


@admin_router.post(
    "/users/notifications/targets",
    response_model=schemas.pagination.InifiniteScrollPagnition[schemas.notification.NotificationTarget],
)
async def search_admin_user_notification_targets(
    search_request: schemas.admin.AdminUserNotificationTargetSearchRequest,
    db: AsyncSession = Depends(get_async_db),
    user: models.user.User = Depends(get_current_user),
):
    _ensure_privileged_user(user)
    db_user = await crud.user.get_user_by_id_async(db=db, user_id=search_request.user_id)
    if db_user is None:
        raise schemas.error.CustomException("User not found", code=404)

    db_notification_targets = await crud.notification.search_notification_targets_for_user_async(
        db=db,
        user_id=db_user.id,
        keyword=search_request.keyword,
        start=search_request.start,
        limit=search_request.limit,
    )
    total = await crud.notification.count_all_notification_targets_for_user_async(
        db=db,
        user_id=db_user.id,
        keyword=search_request.keyword,
    )
    has_more = False
    next_start = None
    if search_request.limit > 0 and len(db_notification_targets) == search_request.limit:
        next_notification_target = await crud.notification.search_next_notification_target_for_user_async(
            db=db,
            user_id=db_user.id,
            notification_target=db_notification_targets[-1][0],
            keyword=search_request.keyword,
        )
        has_more = next_notification_target is not None
        next_start = next_notification_target[0].id if next_notification_target is not None else None

    data = [
        schemas.notification.NotificationTarget.model_validate(
            {
                **schemas.notification.NotificationTarget.model_validate(item[0]).model_dump(),
                "is_forked": False,
            }
        )
        for item in db_notification_targets
    ]
    return schemas.pagination.InifiniteScrollPagnition(
        total=total,
        elements=data,
        start=search_request.start,
        limit=search_request.limit,
        has_more=has_more,
        next_start=next_start,
    )


@admin_router.post(
    "/users/notifications/source/usable",
    response_model=schemas.notification.NotificationSourcesUsableResponse,
)
async def get_admin_user_usable_notification_sources(
    request: schemas.admin.AdminUserComputeInfoRequest,
    db: AsyncSession = Depends(get_async_db),
    user: models.user.User = Depends(get_current_user),
):
    _ensure_privileged_user(user)
    db_user = await crud.user.get_user_by_id_async(db=db, user_id=request.user_id)
    if db_user is None:
        raise schemas.error.CustomException("User not found", code=404)
    db_notification_sources = await crud.notification.get_usable_notification_sources_for_user_async(
        db=db,
        user_id=db_user.id,
    )
    return schemas.notification.NotificationSourcesUsableResponse(
        data=[
            schemas.notification.NotificationSource.model_validate(item)
            for item in db_notification_sources
        ]
    )


@admin_router.post(
    "/users/notifications/target/usable",
    response_model=schemas.notification.NotificationTargetsUsableResponse,
)
async def get_admin_user_usable_notification_targets(
    request: schemas.admin.AdminUserComputeInfoRequest,
    db: AsyncSession = Depends(get_async_db),
    user: models.user.User = Depends(get_current_user),
):
    _ensure_privileged_user(user)
    db_user = await crud.user.get_user_by_id_async(db=db, user_id=request.user_id)
    if db_user is None:
        raise schemas.error.CustomException("User not found", code=404)
    db_notification_targets = await crud.notification.get_usable_notification_targets_for_user_async(
        db=db,
        user_id=db_user.id,
    )
    return schemas.notification.NotificationTargetsUsableResponse(
        data=[
            schemas.notification.NotificationTarget.model_validate(item)
            for item in db_notification_targets
        ]
    )


@admin_router.post(
    "/users/notifications/task/mine",
    response_model=schemas.pagination.Pagination[schemas.notification.NotificationTask],
)
async def get_admin_user_notification_tasks(
    request: schemas.admin.AdminUserNotificationTaskPageRequest,
    db: AsyncSession = Depends(get_async_db),
    user: models.user.User = Depends(get_current_user),
):
    _ensure_privileged_user(user)
    db_user = await crud.user.get_user_by_id_async(db=db, user_id=request.user_id)
    if db_user is None:
        raise schemas.error.CustomException("User not found", code=404)

    db_notification_tasks = await crud.notification.get_notification_tasks_for_user_async(
        db=db,
        user_id=db_user.id,
        page_num=request.page_num,
        page_size=request.page_size,
    )
    elements = [
        await _build_notification_task_response(db=db, db_notification_task=item)
        for item in db_notification_tasks
    ]
    count = await crud.notification.count_notification_tasks_for_user_async(
        db=db,
        user_id=db_user.id,
    )
    total_pages = (count + request.page_size - 1) // request.page_size
    return schemas.pagination.Pagination(
        total_elements=count,
        total_pages=total_pages,
        page_num=request.page_num,
        page_size=request.page_size,
        current_page_elements=len(elements),
        elements=elements,
    )


@admin_router.post(
    "/users/notifications/task/detail",
    response_model=schemas.notification.NotificationTask,
)
async def get_admin_user_notification_task_detail(
    request: schemas.admin.AdminNotificationTaskDetailRequest,
    db: AsyncSession = Depends(get_async_db),
    user: models.user.User = Depends(get_current_user),
):
    _ensure_privileged_user(user)
    db_user = await crud.user.get_user_by_id_async(db=db, user_id=request.user_id)
    if db_user is None:
        raise schemas.error.CustomException("User not found", code=404)
    db_notification_task = await crud.notification.get_notification_task_by_notification_task_id_async(
        db=db,
        notification_task_id=request.notification_task_id,
    )
    if db_notification_task is None or db_notification_task.creator_id != db_user.id:
        raise schemas.error.CustomException("Notification task not found", code=404)
    return await _build_notification_task_response(
        db=db,
        db_notification_task=db_notification_task,
    )


@admin_router.post(
    "/users/notifications/task/add",
    response_model=schemas.common.NormalResponse,
)
async def add_admin_user_notification_task(
    request: schemas.admin.AdminAddNotificationTaskRequest,
    db: AsyncSession = Depends(get_async_db),
    user: models.user.User = Depends(get_current_user),
):
    _ensure_privileged_user(user)
    db_user = await crud.user.get_user_by_id_async(db=db, user_id=request.user_id)
    if db_user is None:
        raise schemas.error.CustomException("User not found", code=404)
    await _validate_notification_source_target_pair(
        db=db,
        notification_source_id=request.notification_source_id,
        notification_target_id=request.notification_target_id,
    )
    if request.trigger_event_id is None:
        raise schemas.error.CustomException("Trigger event ID is required", code=400)

    db_notification_task = await crud.notification.create_notification_task_async(
        db=db,
        creator_id=db_user.id,
        title=request.title,
        notification_target_id=request.notification_target_id,
        notification_source_id=request.notification_source_id,
        enable=request.enable,
    )
    await _sync_notification_task_event_configuration(
        db=db,
        notification_task_id=db_notification_task.id,
        trigger_event_id=request.trigger_event_id,
    )
    await db.commit()
    return schemas.common.SuccessResponse()


@admin_router.post(
    "/users/notifications/task/update",
    response_model=schemas.common.NormalResponse,
)
async def update_admin_user_notification_task(
    request: schemas.admin.AdminUpdateNotificationTaskRequest,
    db: AsyncSession = Depends(get_async_db),
    user: models.user.User = Depends(get_current_user),
):
    _ensure_privileged_user(user)
    db_user = await crud.user.get_user_by_id_async(db=db, user_id=request.user_id)
    if db_user is None:
        raise schemas.error.CustomException("User not found", code=404)
    now = datetime.now(tz=timezone.utc)
    db_notification_task = await crud.notification.get_notification_task_by_notification_task_id_async(
        db=db,
        notification_task_id=request.notification_task_id,
    )
    if db_notification_task is None or db_notification_task.creator_id != db_user.id:
        raise schemas.error.CustomException("Notification task not found", code=404)

    if request.title is not None:
        db_notification_task.title = request.title

    if request.notification_source_id is not None or request.notification_target_id is not None:
        await _validate_notification_source_target_pair(
            db=db,
            notification_source_id=request.notification_source_id or db_notification_task.notification_source_id,
            notification_target_id=request.notification_target_id or db_notification_task.notification_target_id,
        )
    if request.notification_source_id is not None:
        db_notification_task.notification_source_id = request.notification_source_id
    if request.notification_target_id is not None:
        db_notification_task.notification_target_id = request.notification_target_id

    if request.trigger_event_id is not None:
        await _sync_notification_task_event_configuration(
            db=db,
            notification_task_id=request.notification_task_id,
            trigger_event_id=request.trigger_event_id,
        )

    if request.enable is not None:
        db_notification_task.enable = request.enable

    db_notification_task.update_time = now
    await db.commit()
    return schemas.common.SuccessResponse()


@admin_router.post(
    "/users/notifications/task/delete",
    response_model=schemas.common.NormalResponse,
)
async def delete_admin_user_notification_task(
    request: schemas.admin.AdminDeleteNotificationTaskRequest,
    db: AsyncSession = Depends(get_async_db),
    user: models.user.User = Depends(get_current_user),
):
    _ensure_privileged_user(user)
    db_user = await crud.user.get_user_by_id_async(db=db, user_id=request.user_id)
    if db_user is None:
        raise schemas.error.CustomException("User not found", code=404)

    await crud.notification.delete_notification_tasks_async(
        db=db,
        user_id=db_user.id,
        notification_task_ids=request.notification_task_ids,
    )
    for notification_task_id in request.notification_task_ids:
        await crud.notification.delete_notification_task_content_template_by_notification_task_id_async(
            db=db,
            user_id=db_user.id,
            notification_task_id=notification_task_id,
        )
    await db.commit()
    return schemas.common.SuccessResponse()


@admin_router.post(
    "/users/avatar/upload",
    response_model=schemas.file_system.GenericFileSystemUploadResponse,
)
async def upload_admin_user_avatar(
    user_id: int = Form(...),
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_async_db),
    user: models.user.User = Depends(get_current_user),
):
    _ensure_privileged_user(user)

    db_user = await crud.user.get_user_by_id_async(db=db, user_id=user_id)
    if db_user is None:
        raise schemas.error.CustomException("User not found", code=404)

    _ensure_manageable_user(operator=user, target_user=db_user)

    content_type = (file.content_type or "").strip().lower()
    if not content_type.startswith("image/"):
        raise schemas.error.CustomException("Only image files are allowed", code=400)

    suffix = Path(file.filename or "").suffix.lower() or ".png"
    if len(suffix) > 10 or not suffix.startswith("."):
        suffix = ".png"

    file_path = f"images/avatars/{uuid4().hex}{suffix}"
    content = await file.read()
    validate_file_upload_size(file_path=file_path, size=len(content))

    remote_file_service = await FileSystemProxy.create(user_id=db_user.id)
    await remote_file_service.upload_raw_content_to_path(
        file_path=file_path,
        content=content,
        content_type=content_type,
    )

    return schemas.file_system.GenericFileSystemUploadResponse(
        file_path=file_path,
    )


@admin_router.post(
    "/users/notifications/cover/upload",
    response_model=schemas.file_system.GenericFileSystemUploadResponse,
)
async def upload_admin_user_notification_cover(
    user_id: int = Form(...),
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_async_db),
    user: models.user.User = Depends(get_current_user),
):
    _ensure_privileged_user(user)

    db_user = await crud.user.get_user_by_id_async(db=db, user_id=user_id)
    if db_user is None:
        raise schemas.error.CustomException("User not found", code=404)

    _ensure_manageable_user(operator=user, target_user=db_user)

    content_type = (file.content_type or "").strip().lower()
    if not content_type.startswith("image/"):
        raise schemas.error.CustomException("Only image files are allowed", code=400)

    suffix = Path(file.filename or "").suffix.lower() or ".png"
    if len(suffix) > 10 or not suffix.startswith("."):
        suffix = ".png"

    file_path = f"images/notifications/{uuid4().hex}{suffix}"
    content = await file.read()
    validate_file_upload_size(file_path=file_path, size=len(content))

    remote_file_service = await FileSystemProxy.create(user_id=db_user.id)
    await remote_file_service.upload_raw_content_to_path(
        file_path=file_path,
        content=content,
        content_type=content_type,
    )

    return schemas.file_system.GenericFileSystemUploadResponse(
        file_path=file_path,
    )


@admin_router.post("/users/delete", response_model=schemas.common.NormalResponse)
async def delete_admin_user(
    delete_request: schemas.admin.AdminUserDeleteRequest,
    db: AsyncSession = Depends(get_async_db),
    user: models.user.User = Depends(get_current_user),
):
    _ensure_privileged_user(user)
    db_user = await crud.user.get_user_by_id_async(db=db, user_id=delete_request.user_id)
    if db_user is None:
        raise schemas.error.CustomException("User not found", code=404)
    _ensure_manageable_user(operator=user, target_user=db_user)
    if db_user.id == user.id:
        raise schemas.error.CustomException("You can't delete yourself here", code=400)

    await _delete_user_with_related_resources(db=db, user=db_user)
    return schemas.common.SuccessResponse(message="The user is deleted successfully.")


@admin_router.post(
    "/documents/search",
    response_model=schemas.pagination.Pagination[schemas.admin.AdminDocumentSummary],
)
async def search_admin_documents(
    search_request: schemas.admin.AdminDocumentSearchRequest,
    db: AsyncSession = Depends(get_async_db),
    user: models.user.User = Depends(get_current_user),
):
    _ensure_privileged_user(user)

    filters = [
        models.document.Document.delete_at.is_(None),
        models.user.User.delete_at.is_(None),
    ]
    keyword = search_request.keyword.strip() if search_request.keyword else None
    if keyword:
        filters.append(
            or_(
                models.document.Document.title.like(f"%{keyword}%"),
                models.document.Document.description.like(f"%{keyword}%"),
            )
        )

    total = int(
        (
            await db.execute(
                select(func.count(func.distinct(models.document.Document.id)))
                .select_from(models.document.Document)
                .join(models.user.User, models.user.User.id == models.document.Document.creator_id)
                .where(*filters)
            )
        ).scalar()
        or 0
    )
    documents = list(
        (
            await db.execute(
                select(models.document.Document)
                .join(models.user.User, models.user.User.id == models.document.Document.creator_id)
                .where(*filters)
                .order_by(models.document.Document.id.desc())
                .offset((search_request.page_num - 1) * search_request.page_size)
                .limit(search_request.page_size)
            )
        ).scalars().all()
    )

    items = [
        schemas.admin.AdminDocumentSummary(
            id=document.id,
            title=document.title,
            description=document.description,
            category=document.category,
            from_plat=document.from_plat,
            creator_id=document.creator_id,
            creator_nickname=document.creator.nickname,
            create_time=document.create_time,
            update_time=document.update_time,
        )
        for document in documents
    ]
    total_pages = (
        (total + search_request.page_size - 1) // search_request.page_size
        if search_request.page_size > 0
        else 0
    )
    return schemas.pagination.Pagination(
        total_elements=total,
        current_page_elements=len(items),
        total_pages=total_pages,
        page_num=search_request.page_num,
        page_size=search_request.page_size,
        elements=items,
    )


@admin_router.post("/documents/detail", response_model=schemas.admin.AdminDocumentDetailResponse)
async def get_admin_document_detail(
    detail_request: schemas.admin.AdminDocumentDetailRequest,
    db: AsyncSession = Depends(get_async_db),
    user: models.user.User = Depends(get_current_user),
):
    _ensure_privileged_user(user)
    document = await crud.document.get_document_by_document_id_async(
        db=db,
        document_id=detail_request.document_id,
    )
    if document is None:
        raise schemas.error.CustomException("Document not found", code=404)
    return await _build_admin_document_detail(db=db, document=document)


@admin_router.post("/documents/delete", response_model=schemas.common.NormalResponse)
async def delete_admin_documents(
    delete_request: schemas.admin.AdminDocumentDeleteRequest,
    db: AsyncSession = Depends(get_async_db),
    user: models.user.User = Depends(get_current_user),
):
    _ensure_privileged_user(user)

    documents = await crud.document.get_documents_by_document_ids_async(
        db=db,
        document_ids=delete_request.document_ids,
    )
    found_document_ids = {document.id for document in documents}
    missing_document_ids = [
        document_id
        for document_id in delete_request.document_ids
        if document_id not in found_document_ids
    ]
    if missing_document_ids:
        raise schemas.error.CustomException(
            f"Document not found: {missing_document_ids[0]}",
            code=404,
        )

    await delete_document_chunk_snapshots(
        db=db,
        documents=documents,
    )

    document_ids = [document.id for document in documents]
    creator_ids = {document.creator_id for document in documents}

    await crud.task.cancel_document_tasks_by_document_ids_async(
        db=db,
        document_ids=document_ids,
    )
    for creator_id in creator_ids:
        creator_document_ids = [document.id for document in documents if document.creator_id == creator_id]
        await crud.document.delete_user_documents_by_document_ids_async(
            db=db,
            document_ids=creator_document_ids,
            user_id=creator_id,
        )
    await crud.document.delete_document_labels_by_document_ids_async(
        db=db,
        document_ids=document_ids,
    )
    await crud.document.delete_document_notes_by_document_ids_async(
        db=db,
        document_ids=document_ids,
    )

    grouped_document_ids = group_document_ids_by_category(documents)
    if grouped_document_ids.get(DocumentCategory.FILE):
        await crud.document.delete_file_documents_by_document_ids_async(
            db=db,
            document_ids=grouped_document_ids[DocumentCategory.FILE],
        )
    if grouped_document_ids.get(DocumentCategory.WEBSITE):
        await crud.document.delete_website_documents_by_document_ids_async(
            db=db,
            document_ids=grouped_document_ids[DocumentCategory.WEBSITE],
        )
    if grouped_document_ids.get(DocumentCategory.QUICK_NOTE):
        await crud.document.delete_quick_note_documents_by_document_ids_async(
            db=db,
            document_ids=grouped_document_ids[DocumentCategory.QUICK_NOTE],
        )
    if grouped_document_ids.get(DocumentCategory.AUDIO):
        await crud.document.delete_audio_documents_by_document_ids_async(
            db=db,
            document_ids=grouped_document_ids[DocumentCategory.AUDIO],
        )

    delete_documents_and_related_from_neo4j(doc_ids=document_ids)
    delete_documents_from_milvus(doc_ids=document_ids)
    await db.commit()
    return schemas.common.SuccessResponse(message="The documents are deleted successfully.")


@admin_router.post(
    "/sections/search",
    response_model=schemas.pagination.Pagination[schemas.admin.AdminSectionSummary],
)
async def search_admin_sections(
    search_request: schemas.admin.AdminSectionSearchRequest,
    db: AsyncSession = Depends(get_async_db),
    user: models.user.User = Depends(get_current_user),
):
    _ensure_privileged_user(user)

    filters = [
        models.section.Section.delete_at.is_(None),
        models.user.User.delete_at.is_(None),
    ]
    keyword = search_request.keyword.strip() if search_request.keyword else None
    if keyword:
        filters.append(
            or_(
                models.section.Section.title.like(f"%{keyword}%"),
                models.section.Section.description.like(f"%{keyword}%"),
            )
        )
    total = int(
        (
            await db.execute(
                select(func.count(func.distinct(models.section.Section.id)))
                .select_from(models.section.Section)
                .join(models.user.User, models.user.User.id == models.section.Section.creator_id)
                .where(*filters)
            )
        ).scalar()
        or 0
    )
    sections = list(
        (
            await db.execute(
                select(models.section.Section)
                .join(models.user.User, models.user.User.id == models.section.Section.creator_id)
                .where(*filters)
                .order_by(models.section.Section.id.desc())
                .offset((search_request.page_num - 1) * search_request.page_size)
                .limit(search_request.page_size)
            )
        ).scalars().all()
    )

    section_ids = [section.id for section in sections]
    documents_count_by_section_id = await crud.section.count_documents_for_section_by_section_ids_async(
        db=db,
        section_ids=section_ids,
    )
    subscribers_count_by_section_id = await crud.section.count_users_for_section_by_section_ids_async(
        db=db,
        section_ids=section_ids,
        filter_roles=[UserSectionRole.SUBSCRIBER],
    )
    publish_sections = await crud.section.get_publish_sections_by_section_ids_async(
        db=db,
        section_ids=section_ids,
    )
    publish_uuid_by_section_id = {
        item.section_id: item.uuid for item in publish_sections
    }

    items = [
        schemas.admin.AdminSectionSummary(
            id=section.id,
            title=section.title,
            description=section.description,
            creator_id=section.creator_id,
            creator_nickname=section.creator.nickname,
            documents_count=documents_count_by_section_id.get(section.id, 0),
            subscribers_count=subscribers_count_by_section_id.get(section.id, 0),
            publish_uuid=publish_uuid_by_section_id.get(section.id),
            create_time=section.create_time,
            update_time=section.update_time,
        )
        for section in sections
    ]
    total_pages = (
        (total + search_request.page_size - 1) // search_request.page_size
        if search_request.page_size > 0
        else 0
    )
    return schemas.pagination.Pagination(
        total_elements=total,
        current_page_elements=len(items),
        total_pages=total_pages,
        page_num=search_request.page_num,
        page_size=search_request.page_size,
        elements=items,
    )


@admin_router.post("/sections/detail", response_model=schemas.admin.AdminSectionDetailResponse)
async def get_admin_section_detail(
    detail_request: schemas.admin.AdminSectionDetailRequest,
    db: AsyncSession = Depends(get_async_db),
    user: models.user.User = Depends(get_current_user),
):
    _ensure_privileged_user(user)
    db_section = await crud.section.get_section_by_section_id_async(
        db=db,
        section_id=detail_request.section_id,
    )
    if db_section is None:
        raise schemas.error.CustomException("Section not found", code=404)
    return await _build_section_info_response(
        db=db,
        db_section=db_section,
        section_id=db_section.id,
        viewer_user_id=user.id,
        include_subscription_flag=False,
    )


@admin_router.post("/sections/delete", response_model=schemas.common.NormalResponse)
async def delete_admin_sections(
    delete_request: schemas.admin.AdminSectionDeleteRequest,
    db: AsyncSession = Depends(get_async_db),
    user: models.user.User = Depends(get_current_user),
):
    _ensure_privileged_user(user)
    removed_from_section_notifications_to_send: list[tuple[int, int]] = []

    for section_id in delete_request.section_ids:
        db_section = await crud.section.get_section_by_section_id_async(
            db=db,
            section_id=section_id,
        )
        if db_section is None:
            raise schemas.error.CustomException(f"Section not found: {section_id}", code=404)

        db_users = await crud.section.get_users_for_section_by_section_id_async(
            db=db,
            section_id=section_id,
            filter_roles=[UserSectionRole.MEMBER, UserSectionRole.SUBSCRIBER],
        )
        await crud.section.delete_section_users_by_section_id_async(
            db=db,
            section_id=section_id,
        )
        await crud.section.delete_section_documents_by_section_id_async(
            db=db,
            section_id=section_id,
        )
        await crud.section.delete_section_labels_by_section_id_async(
            db=db,
            section_id=section_id,
        )
        await crud.section.delete_section_comments_by_section_id_async(
            db=db,
            section_id=section_id,
        )
        await crud.section.delete_section_by_section_id_async(
            db=db,
            section_id=section_id,
        )
        for db_user in db_users:
            if db_user.id != db_section.creator_id:
                removed_from_section_notifications_to_send.append((db_user.id, section_id))

    await db.commit()
    for target_user_id, section_id in removed_from_section_notifications_to_send:
        start_trigger_user_notification_event.delay(
            user_id=target_user_id,
            trigger_event_uuid=NotificationTriggerEventUUID.REMOVED_FROM_SECTION.value,
            params={
                "section_id": section_id,
                "user_id": target_user_id,
            },
        )
    return schemas.common.SuccessResponse(message="The sections are deleted successfully.")
