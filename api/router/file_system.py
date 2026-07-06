from datetime import datetime, timezone
from typing import cast
from urllib.parse import parse_qs, unquote, urlparse

from fastapi import APIRouter, Depends, File, Form, UploadFile, Query
from fastapi.responses import RedirectResponse
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

import json
import crud
import models
import schemas
from common.encrypt import encrypt_file_system_config, decrypt_file_system_config
from common.upload_limits import (
    can_upgrade_document_upload,
    get_document_upload_limit_bytes,
    validate_file_upload_size,
)
from enums.file import RemoteFileService
from common.dependencies import get_async_db, get_current_user, resolve_user_plan_level
from proxy.file_system_proxy import FileSystemProxy
from data.sql.base import async_session_context
from file.generic_s3_remote_file_service import GenericS3RemoteFileService

file_system_router = APIRouter()


def _normalize_presign_file_path(path: str, bucket: str | None = None) -> str:
    path = (path or "").strip()
    if not path:
        raise schemas.error.CustomException(code=400, message="Path is required")

    if path.startswith(("http://", "https://")):
        parsed = urlparse(path)
        query = parse_qs(parsed.query)
        if "path" in query and query["path"]:
            path = query["path"][0]
        else:
            normalized_path = unquote(parsed.path.lstrip("/"))
            if bucket and normalized_path.startswith(f"{bucket}/"):
                normalized_path = normalized_path[len(bucket) + 1 :]
            path = normalized_path

    return _normalize_and_validate_path(path)


@file_system_router.post("/upload-limits", response_model=schemas.file_system.DocumentUploadLimitResponse)
async def get_document_upload_limits(
    current_user: models.user.User = Depends(get_current_user),
):
    plan_level = await resolve_user_plan_level(current_user)
    return schemas.file_system.DocumentUploadLimitResponse(
        document_max_upload_bytes=get_document_upload_limit_bytes(plan_level),
        can_upgrade=can_upgrade_document_upload(plan_level),
    )

@file_system_router.post("/presign-upload-url", response_model=schemas.file_system.PresignUploadURLResponse)
async def get_presigned_url(
    presign_upload_url_request: schemas.file_system.PresignUploadURLRequest,
    db: AsyncSession = Depends(get_async_db),
    current_user: models.user.User = Depends(get_current_user)
):  
    file_service = await FileSystemProxy.create(
        user_id=current_user.id
    )
    default_user_file_system = current_user.default_user_file_system
    if default_user_file_system is None:
        raise schemas.error.CustomException(code=404, message="User file system not found")
    normalized_file_path = _normalize_presign_file_path(
        presign_upload_url_request.file_path,
        bucket=getattr(file_service, "bucket", None),
    )
    user_plan_level = await resolve_user_plan_level(current_user)
    response = file_service.presign_put_url(
        file_path=normalized_file_path,
        content_type=presign_upload_url_request.content_type,
        expires_in=3600,
        max_upload_bytes=get_document_upload_limit_bytes(user_plan_level),
    )
    stored_file = await crud.file_system.upsert_stored_file_async(
        db=db,
        owner_user_id=current_user.id,
        user_file_system_id=default_user_file_system,
        file_system_id=file_service.file_system_id,
        path=normalized_file_path,
        content_type=presign_upload_url_request.content_type,
        source="presign_upload",
    )
    await db.commit()
    return schemas.file_system.PresignUploadURLResponse(
        upload_url=response.upload_url,
        file_path=normalized_file_path,
        fields=response.fields,
        expiration=response.expiration,
        stored_file_id=stored_file.id,
    )

@file_system_router.post('/detail', response_model=schemas.file_system.FileSystemInfo)
async def get_file_system_info(
    file_system_info_request: schemas.file_system.FileSystemInfoRequest,
    db: AsyncSession = Depends(get_async_db),
    current_user: models.user.User = Depends(get_current_user)
):
    db_file_system = await crud.file_system.get_file_system_by_id_async(
        db=db,
        file_system_id=file_system_info_request.file_system_id
    )
    if db_file_system is None:
        raise schemas.error.CustomException(code=404, message="File system not found")
    return schemas.file_system.FileSystemInfo.model_validate(db_file_system)

def _normalize_and_validate_path(path: str) -> str:
    """
    防止：
    - 空 path
    - 以 / 开头（避免绝对路径语义）
    - .. 路径穿越
    - 反斜杠
    """
    path = (path or "").strip()
    if not path:
        raise schemas.error.CustomException(code=400, message="Path is required")

    if path.startswith("/"):
        path = path.lstrip("/")

    if "\\" in path:
        raise schemas.error.CustomException(code=400, message="Path is invalid")

    parts = path.split("/")
    if any(p in ("..", "") for p in parts):
        # "" 会出现于 //，也一起拒掉
        raise schemas.error.CustomException(code=400, message="Path is invalid")

    return path


async def _count_legacy_path_candidates(
    *,
    db: AsyncSession,
    owner_user_id: int,
    select_path_sql: str,
) -> int:
    result = await db.execute(
        text(
            f"""
            SELECT COUNT(DISTINCT candidate.path)
            FROM ({select_path_sql}) AS candidate
            WHERE candidate.path IS NOT NULL
              AND candidate.path NOT LIKE 'http://%'
              AND candidate.path NOT LIKE 'https://%'
              AND candidate.path NOT LIKE 'data:%'
              AND candidate.path NOT LIKE 'blob:%'
            """
        ),
        {
            "owner_user_id": owner_user_id,
        },
    )
    return int(result.scalar_one() or 0)


async def _insert_stored_files_from_legacy_paths(
    *,
    db: AsyncSession,
    owner_user_id: int,
    user_file_system_id: int,
    file_system_id: int,
    source: str,
    select_path_sql: str,
) -> int:
    result = await db.execute(
        text(
            f"""
            INSERT INTO stored_file (
                owner_user_id,
                user_file_system_id,
                file_system_id,
                path,
                source,
                create_time
            )
            SELECT DISTINCT
                :owner_user_id,
                :user_file_system_id,
                :file_system_id,
                candidate.path,
                :source,
                CURRENT_TIMESTAMP
            FROM ({select_path_sql}) AS candidate
            WHERE candidate.path IS NOT NULL
              AND candidate.path NOT LIKE 'http://%'
              AND candidate.path NOT LIKE 'https://%'
              AND candidate.path NOT LIKE 'data:%'
              AND candidate.path NOT LIKE 'blob:%'
            ON CONFLICT (owner_user_id, user_file_system_id, path) DO UPDATE SET
                file_system_id = EXCLUDED.file_system_id,
                source = COALESCE(stored_file.source, EXCLUDED.source),
                delete_at = NULL,
                update_time = CURRENT_TIMESTAMP
            """
        ),
        {
            "owner_user_id": owner_user_id,
            "user_file_system_id": user_file_system_id,
            "file_system_id": file_system_id,
            "source": source,
        },
    )
    return max(result.rowcount or 0, 0)


async def _sync_stored_files_from_legacy_paths(
    *,
    db: AsyncSession,
    current_user: models.user.User,
    user_file_system_id: int | None,
) -> tuple[int, int]:
    selected_user_file_system_id = user_file_system_id or current_user.default_user_file_system
    if selected_user_file_system_id is None:
        raise schemas.error.CustomException(code=404, message="User file system not found")

    user_file_system = await crud.file_system.get_user_file_system_by_id_async(
        db=db,
        user_file_system_id=selected_user_file_system_id,
    )
    if user_file_system is None or user_file_system.user_id != current_user.id:
        raise schemas.error.CustomException(code=404, message="User file system not found")

    sources = [
        ("user_avatar", 'SELECT avatar AS path FROM "user" WHERE id = :owner_user_id'),
        ("user_cover", 'SELECT cover AS path FROM "user" WHERE id = :owner_user_id'),
        ("document_cover", "SELECT cover AS path FROM document WHERE creator_id = :owner_user_id"),
        ("section_cover", "SELECT cover AS path FROM section WHERE creator_id = :owner_user_id"),
        ("section_markdown", "SELECT md_file_name AS path FROM section WHERE creator_id = :owner_user_id"),
        (
            "quick_note",
            """
            SELECT q.md_file_name AS path
            FROM quick_note_document q
            JOIN document d ON d.id = q.document_id
            WHERE d.creator_id = :owner_user_id
            """,
        ),
        (
            "file_document",
            """
            SELECT f.file_name AS path
            FROM file_document f
            JOIN document d ON d.id = f.document_id
            WHERE d.creator_id = :owner_user_id
            """,
        ),
        (
            "audio_document",
            """
            SELECT a.audio_file_name AS path
            FROM audio_document a
            JOIN document d ON d.id = a.document_id
            WHERE d.creator_id = :owner_user_id
            """,
        ),
        (
            "website_snapshot_markdown",
            """
            SELECT w.md_file_name AS path
            FROM website_document_snapshot w
            JOIN document d ON d.id = w.document_id
            WHERE d.creator_id = :owner_user_id
            """,
        ),
        (
            "website_snapshot_cover",
            """
            SELECT w.cover AS path
            FROM website_document_snapshot w
            JOIN document d ON d.id = w.document_id
            WHERE d.creator_id = :owner_user_id
            """,
        ),
        (
            "document_convert",
            "SELECT md_file_name AS path FROM document_convert_to_md_task WHERE user_id = :owner_user_id",
        ),
        (
            "document_transcribe",
            "SELECT md_file_name AS path FROM document_audio_transcribe_task WHERE user_id = :owner_user_id",
        ),
        (
            "document_transcribe_segments",
            "SELECT segments_file_name AS path FROM document_audio_transcribe_task WHERE user_id = :owner_user_id",
        ),
        (
            "document_podcast",
            "SELECT podcast_file_name AS path FROM document_podcast_task WHERE user_id = :owner_user_id",
        ),
        (
            "document_podcast_script",
            "SELECT podcast_script_file_name AS path FROM document_podcast_task WHERE user_id = :owner_user_id",
        ),
        (
            "section_podcast",
            "SELECT podcast_file_name AS path FROM section_podcast_task WHERE user_id = :owner_user_id",
        ),
        (
            "section_podcast_script",
            "SELECT podcast_script_file_name AS path FROM section_podcast_task WHERE user_id = :owner_user_id",
        ),
    ]

    candidates = 0
    synced = 0
    for source, select_path_sql in sources:
        candidates += await _count_legacy_path_candidates(
            db=db,
            owner_user_id=current_user.id,
            select_path_sql=select_path_sql,
        )
        synced += await _insert_stored_files_from_legacy_paths(
            db=db,
            owner_user_id=current_user.id,
            user_file_system_id=user_file_system.id,
            file_system_id=user_file_system.file_system_id,
            source=source,
            select_path_sql=select_path_sql,
        )
    return synced, candidates

@file_system_router.get("/url/resolve", include_in_schema=False)
async def resolve_file(
    path: str = Query(..., description="Object key/path in user's bucket"),
    owner_id: int = Query(..., description="Owner's user id"),
    user_file_system_id: int | None = Query(default=None, description="Pinned user file system id"),
):
    # 1) path 校验（防穿越）
    key = _normalize_and_validate_path(path)

    if user_file_system_id is None:
        async with async_session_context() as db:
            stored_file = await crud.file_system.get_stored_file_by_owner_path_async(
                db=db,
                owner_user_id=owner_id,
                path=key,
            )
        user_file_system_id = stored_file.user_file_system_id if stored_file is not None else None

    # 2) 初始化文件服务
    file_service = (
        await FileSystemProxy.create_for_user_file_system(
            user_id=owner_id,
            user_file_system_id=user_file_system_id,
        )
        if user_file_system_id is not None
        else await FileSystemProxy.create(user_id=owner_id)
    )

    # 3) 生成短期 presigned URL（建议 60~300 秒）
    url = file_service.presign_get_url(
        file_path=key, 
        expires_seconds=120
    )

    # 4) 返回 Redirect（307：保留 method；GET 用 302/307 都行）
    # 你也可以用 302
    return RedirectResponse(url=url, status_code=307)


@file_system_router.post("/files/search", response_model=schemas.file_system.StoredFileSearchResponse)
async def search_stored_files(
    stored_file_search_request: schemas.file_system.StoredFileSearchRequest,
    db: AsyncSession = Depends(get_async_db),
    current_user: models.user.User = Depends(get_current_user),
):
    rows = await crud.file_system.search_stored_files_async(
        db=db,
        owner_user_id=current_user.id,
        keyword=stored_file_search_request.keyword,
        user_file_system_id=stored_file_search_request.user_file_system_id,
        start=stored_file_search_request.start,
        limit=stored_file_search_request.limit,
    )
    has_more = len(rows) > stored_file_search_request.limit
    visible_rows = rows[: stored_file_search_request.limit]
    total = await crud.file_system.count_stored_files_async(
        db=db,
        owner_user_id=current_user.id,
        keyword=stored_file_search_request.keyword,
        user_file_system_id=stored_file_search_request.user_file_system_id,
    )
    return schemas.file_system.StoredFileSearchResponse(
        total=total,
        start=stored_file_search_request.start,
        limit=stored_file_search_request.limit,
        has_more=has_more,
        next_start=visible_rows[-1].id if has_more and visible_rows else None,
        data=[
            schemas.file_system.StoredFileInfo.model_validate(row)
            for row in visible_rows
        ],
    )


@file_system_router.post("/files/sync", response_model=schemas.file_system.StoredFileSyncResponse)
async def sync_stored_files(
    sync_request: schemas.file_system.StoredFileSyncRequest,
    db: AsyncSession = Depends(get_async_db),
    current_user: models.user.User = Depends(get_current_user),
):
    synced, candidates = await _sync_stored_files_from_legacy_paths(
        db=db,
        current_user=current_user,
        user_file_system_id=sync_request.user_file_system_id,
    )
    await db.commit()
    total = await crud.file_system.count_stored_files_async(
        db=db,
        owner_user_id=current_user.id,
        user_file_system_id=sync_request.user_file_system_id,
    )
    return schemas.file_system.StoredFileSyncResponse(
        synced=synced,
        candidates=candidates,
        total=total,
    )


@file_system_router.post("/files/migrate", response_model=schemas.file_system.StoredFileMigrateResponse)
async def migrate_stored_files(
    migrate_file_system_request: schemas.file_system.MigrateFileSystemRequest,
    db: AsyncSession = Depends(get_async_db),
    current_user: models.user.User = Depends(get_current_user),
):
    source_user_file_system = await crud.file_system.get_user_file_system_by_id_async(
        db=db,
        user_file_system_id=migrate_file_system_request.source_user_file_system_id,
    )
    target_user_file_system = await crud.file_system.get_user_file_system_by_id_async(
        db=db,
        user_file_system_id=migrate_file_system_request.target_user_file_system_id,
    )
    if source_user_file_system is None or source_user_file_system.user_id != current_user.id:
        raise schemas.error.CustomException(code=404, message="Source file system not found")
    if target_user_file_system is None or target_user_file_system.user_id != current_user.id:
        raise schemas.error.CustomException(code=404, message="Target file system not found")
    if source_user_file_system.id == target_user_file_system.id:
        raise schemas.error.CustomException(code=400, message="Source and target file systems must be different")

    if migrate_file_system_request.stored_file_ids:
        stored_files = await crud.file_system.get_stored_files_by_ids_async(
            db=db,
            owner_user_id=current_user.id,
            stored_file_ids=migrate_file_system_request.stored_file_ids,
        )
        stored_files = [
            stored_file
            for stored_file in stored_files
            if stored_file.user_file_system_id == source_user_file_system.id
        ]
    else:
        stored_files = await crud.file_system.search_stored_files_async(
            db=db,
            owner_user_id=current_user.id,
            user_file_system_id=source_user_file_system.id,
            limit=500,
        )

    source_service = await FileSystemProxy.create_for_user_file_system(
        user_id=current_user.id,
        user_file_system_id=source_user_file_system.id,
    )
    target_service = await FileSystemProxy.create_for_user_file_system(
        user_id=current_user.id,
        user_file_system_id=target_user_file_system.id,
    )

    migrated = 0
    failed = 0
    for stored_file in stored_files:
        try:
            content = await source_service.get_file_content_by_file_path(stored_file.path)
            await target_service.upload_raw_content_to_path(
                file_path=stored_file.path,
                content=content,
                content_type=stored_file.content_type,
            )
            await crud.file_system.update_stored_file_location_async(
                db=db,
                stored_file=stored_file,
                user_file_system_id=target_user_file_system.id,
                file_system_id=target_user_file_system.file_system_id,
            )
            migrated += 1
        except Exception:
            failed += 1
    await db.commit()
    return schemas.file_system.StoredFileMigrateResponse(
        migrated=migrated,
        skipped=0,
        failed=failed,
    )

@file_system_router.post('/user-file-system/detail', response_model=schemas.file_system.UserFileSystemDetail)
async def get_user_file_system_info(
    user_file_system_info_request: schemas.file_system.UserFileSystemInfoRequest,
    db: AsyncSession = Depends(get_async_db),
    current_user: models.user.User = Depends(get_current_user)
):
    db_user_file_system = await crud.file_system.get_user_file_system_by_id_async(
        db=db,
        user_file_system_id=user_file_system_info_request.user_file_system_id
    )
    if db_user_file_system is None:
        raise schemas.error.CustomException(code=404, message="User file system not found")
    db_file_system = await crud.file_system.get_file_system_by_id_async(
        db=db,
        file_system_id=db_user_file_system.file_system_id
    )
    if db_file_system is None:
        raise schemas.error.CustomException(code=404, message="File system not found")
    res = schemas.file_system.UserFileSystemDetail(
        id=db_user_file_system.id,
        file_system_id=db_user_file_system.file_system_id,
        title=db_user_file_system.title,
        description=db_user_file_system.description,
        create_time=db_user_file_system.create_time,
        update_time=db_user_file_system.update_time
    )
    if db_user_file_system.user_id == current_user.id and db_user_file_system.config_json is not None:
        # only if the user is the owner of the user file system, the config_json will be returned
        res.config_json=decrypt_file_system_config(db_user_file_system.config_json)
    return res

@file_system_router.post("/mine", response_model=schemas.file_system.MineFileSystemSearchResponse)
async def search_mine_file_system(
    file_system_search_request: schemas.file_system.FileSystemSearchRequest,
    db: AsyncSession = Depends(get_async_db),
    current_user: models.user.User = Depends(get_current_user)
):
    res = []
    db_user_file_systems = await crud.file_system.get_user_file_systems_by_user_id_async(
        db=db,
        user_id=current_user.id,
        keyword=file_system_search_request.keyword
    )
    typed_user_file_systems = cast(
        list[tuple[models.file_system.UserFileSystem, models.file_system.FileSystem]],
        db_user_file_systems
    )
    for db_user_file_system, db_file_system in typed_user_file_systems:
        item = schemas.file_system.UserFileSystemInfo(
            id=db_user_file_system.id,
            file_system_id=db_user_file_system.file_system_id,
            title=db_user_file_system.title,
            description=db_user_file_system.description,
            create_time=db_user_file_system.create_time,
            update_time=db_user_file_system.update_time,
        )
        res.append(item)
    return schemas.file_system.MineFileSystemSearchResponse(data=res)

@file_system_router.post("/provide", response_model=schemas.file_system.ProvideFileSystemSearchResponse)
async def provide_file_system(
    file_system_search_request: schemas.file_system.FileSystemSearchRequest,
    db: AsyncSession = Depends(get_async_db),
    current_user: models.user.User = Depends(get_current_user)
):
    db_file_systems = await crud.file_system.get_all_file_systems_async(
        db=db,
        keyword=file_system_search_request.keyword
    )
    file_systems = [
        schemas.file_system.FileSystemInfo.model_validate(db_file_system, from_attributes=True) for db_file_system in db_file_systems
    ]
    return schemas.file_system.ProvideFileSystemSearchResponse(data=file_systems)

@file_system_router.post("/install", response_model=schemas.file_system.FileSystemInstallResponse)
async def install_user_file_system(
    file_system_install_request: schemas.file_system.FileSystemInstallRequest,
    db: AsyncSession = Depends(get_async_db),
    current_user: models.user.User = Depends(get_current_user)
):
    db_user_file_system = await crud.file_system.create_user_file_system_async(
        db=db,
        user_id=current_user.id,
        file_system_id=file_system_install_request.file_system_id,
        title=file_system_install_request.title,
        description=file_system_install_request.description,
        config_json=file_system_install_request.config_json
    )
    await db.commit()
    return schemas.file_system.FileSystemInstallResponse(user_file_system_id=db_user_file_system.id)

@file_system_router.post("/user-file-system/delete", response_model=schemas.common.NormalResponse)
async def delete_user_file_system(
    user_file_system_delete_request: schemas.file_system.UserFileSystemDeleteRequest,
    db: AsyncSession = Depends(get_async_db),
    current_user: models.user.User = Depends(get_current_user)
):
    now = datetime.now(tz=timezone.utc)
    
    db_user_file_system = await crud.file_system.get_user_file_system_by_id_async(
        db=db,
        user_file_system_id=user_file_system_delete_request.user_file_system_id
    )
    if db_user_file_system is None:
        raise schemas.error.CustomException(code=404, message="User file system not found")
    if db_user_file_system.user_id != current_user.id:
        raise schemas.error.CustomException(code=403, message="You don't have permission to manage this user file system")
    db_user_file_system.delete_at =now
    
    await db.commit()
    return schemas.common.SuccessResponse()

@file_system_router.post("/update", response_model=schemas.common.NormalResponse)
async def update_file_system(
    user_file_system_update_request: schemas.file_system.UserFileSystemUpdateRequest,
    db: AsyncSession = Depends(get_async_db),
    current_user: models.user.User = Depends(get_current_user)
):
    now = datetime.now(tz=timezone.utc)
    user_file_system = await crud.file_system.get_user_file_system_by_id_async(
        db=db,
        user_file_system_id=user_file_system_update_request.user_file_system_id
    )
    if user_file_system is None:
        raise schemas.error.CustomException(code=404, message="User file system not found")
    else:
        if user_file_system_update_request.title is not None:
            user_file_system.title = user_file_system_update_request.title
        if user_file_system_update_request.description is not None:
            user_file_system.description = user_file_system_update_request.description
        if user_file_system_update_request.config_json is not None:
            user_file_system.config_json = encrypt_file_system_config(user_file_system_update_request.config_json)
        user_file_system.update_time = now
    await db.commit()
    return schemas.common.SuccessResponse()


@file_system_router.post("/generic-s3/upload", response_model=schemas.file_system.GenericFileSystemUploadResponse)
async def upload_file_system(
    file: UploadFile = File(...),
    file_path: str = Form(...),
    content_type: str = Form(...),
    db: AsyncSession = Depends(get_async_db),
    current_user: models.user.User = Depends(get_current_user)
):
    file_path = _normalize_and_validate_path(file_path)
    default_user_file_system = current_user.default_user_file_system
    if default_user_file_system is None:
        raise schemas.error.CustomException(code=404, message="User file system not found")

    content = await file.read()
    user_plan_level = await resolve_user_plan_level(current_user)
    validate_file_upload_size(
        file_path=file_path,
        size=len(content),
        plan_level=user_plan_level,
    )
    user_file_system = await crud.file_system.get_user_file_system_by_id_async(
        db=db,
        user_file_system_id=default_user_file_system
    )
    if user_file_system is None:
        raise schemas.error.CustomException(code=404, message="User file system not found")
    if user_file_system.config_json is None:
        raise schemas.error.CustomException(code=404, message="User file system configuration is missing")

    remote_file_service = await FileSystemProxy.create(
        user_id=current_user.id
    )
    if remote_file_service is None:
        raise schemas.error.CustomException(code=404, message="User file system not found")
    if remote_file_service.file_service_uuid != RemoteFileService.Generic_S3.meta.id:
        raise schemas.error.CustomException(code=400, message="Default user file system is not Generic S3")
    generic_s3_remote_file_service = GenericS3RemoteFileService()
    file_config = json.loads(decrypt_file_system_config(user_file_system.config_json))
    generic_s3_remote_file_service.set_config(file_config)
    await generic_s3_remote_file_service.init_client()
    await generic_s3_remote_file_service.upload_raw_content_to_path(
        file_path=file_path,
        content=content,
        content_type=content_type
    )
    stored_file = await crud.file_system.upsert_stored_file_async(
        db=db,
        owner_user_id=current_user.id,
        user_file_system_id=default_user_file_system,
        file_system_id=user_file_system.file_system_id,
        path=file_path,
        content_type=content_type,
        size_bytes=len(content),
        source="generic_s3_upload",
    )
    await db.commit()
    return schemas.file_system.GenericFileSystemUploadResponse(
        file_path=file_path,
        stored_file_id=stored_file.id,
    )
