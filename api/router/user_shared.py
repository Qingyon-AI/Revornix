import asyncio
from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Session

import crud
import models
from common.logger import exception_logger, format_log_message
from enums.file import RemoteFileService
from file.built_in_remote_file_service import BuiltInRemoteFileService
from schemas.error import CustomException


async def authorize_existing_oauth_user(
    db: AsyncSession,
    db_user: models.user.User,
    ip: str | None,
) -> None:
    """Validate an existing user signing in via OAuth and refresh login metadata.

    Why: prior to this, OAuth flows returned a fresh token without checking
    `is_forbidden`, letting banned users keep logging in. Also kept
    last_login_ip/time stale for OAuth re-logins.
    """
    if db_user.is_forbidden:
        raise CustomException(message="User is forbidden", code=403)
    db_user.last_login_ip = ip
    db_user.last_login_time = datetime.now(timezone.utc)
    await db.commit()


def cleanup_user_bucket_sync(file_service: BuiltInRemoteFileService) -> None:
    if file_service.s3_client is None or file_service.bucket is None:
        return
    try:
        file_service.empty_bucket()
    except Exception as cleanup_error:
        exception_logger.error(
            format_log_message(
                "user_bucket_cleanup_empty_failed",
                bucket=file_service.bucket,
                user_id=file_service.user_id,
                error=cleanup_error,
            )
        )
    try:
        file_service.delete_bucket()
    except Exception as cleanup_error:
        exception_logger.error(
            format_log_message(
                "user_bucket_cleanup_delete_failed",
                bucket=file_service.bucket,
                user_id=file_service.user_id,
                error=cleanup_error,
            )
        )


async def init_user_bucket_for_built_in_file_service(db_user: models.user.User) -> BuiltInRemoteFileService:
    file_service = BuiltInRemoteFileService()
    file_service.user_id = db_user.id
    file_service.bucket = db_user.uuid
    try:
        await file_service.init_client()
    except Exception:
        await asyncio.to_thread(cleanup_user_bucket_sync, file_service)
        raise
    return file_service


async def commit_with_bucket_cleanup(
    db: Session,
    file_service: BuiltInRemoteFileService | None = None,
) -> None:
    try:
        db.commit()
    except Exception:
        db.rollback()
        if file_service is not None:
            await asyncio.to_thread(cleanup_user_bucket_sync, file_service)
        raise


async def commit_with_bucket_cleanup_async(
    db: AsyncSession,
    file_service: BuiltInRemoteFileService | None = None,
) -> None:
    try:
        await db.commit()
    except Exception:
        await db.rollback()
        if file_service is not None:
            await asyncio.to_thread(cleanup_user_bucket_sync, file_service)
        raise


async def setup_default_file_system_for_user(
    db: Session,
    db_user: models.user.User,
) -> BuiltInRemoteFileService:
    db_file_system = crud.file_system.get_file_system_by_uuid(
        db=db,
        uuid=RemoteFileService.Built_In.meta.id,
    )
    if db_file_system is None:
        raise CustomException("Built-in file system not found", 404)
    db_user_file_system = crud.file_system.create_user_file_system(
        db=db,
        file_system_id=db_file_system.id,
        user_id=db_user.id,
        title="Default Minio File System",
        description="The default file system for the user",
    )
    db_user.default_user_file_system = db_user_file_system.id
    return await init_user_bucket_for_built_in_file_service(db_user=db_user)


async def setup_default_file_system_for_user_async(
    db: AsyncSession,
    db_user: models.user.User,
) -> BuiltInRemoteFileService:
    db_file_system = await crud.file_system.get_file_system_by_uuid_async(
        db=db,
        uuid=RemoteFileService.Built_In.meta.id,
    )
    if db_file_system is None:
        raise CustomException("Built-in file system not found", 404)
    db_user_file_system = await crud.file_system.create_user_file_system_async(
        db=db,
        file_system_id=db_file_system.id,
        user_id=db_user.id,
        title="Default Minio File System",
        description="The default file system for the user",
    )
    db_user.default_user_file_system = db_user_file_system.id
    await db.flush()
    return await init_user_bucket_for_built_in_file_service(db_user=db_user)
