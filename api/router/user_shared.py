import asyncio
import json
from datetime import datetime, timezone

from redis import Redis
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Session

import crud
import models
import schemas
from common.passkey import new_challenge_id
from common.jwt_utils import create_token
from common.logger import exception_logger, format_log_message
from enums.file import RemoteFileService
from file.built_in_remote_file_service import BuiltInRemoteFileService
from schemas.error import CustomException


async def authorize_existing_oauth_user(
    db: AsyncSession,
    db_user: models.user.User | None,
    ip: str | None,
) -> None:
    """Validate an existing user signing in via OAuth and refresh login metadata.

    Why: prior to this, OAuth flows returned a fresh token without checking
    `is_forbidden`, letting banned users keep logging in. Also kept
    last_login_ip/time stale for OAuth re-logins.

    Defensive None check: every OAuth create-flow looks up a `*_user` record
    by external id, then calls `get_user_by_id_async` which excludes
    soft-deleted Users. If the foreign row is orphaned (e.g. via partial
    commits, manual SQL, or future code paths that forget to soft-delete the
    user-side mirror), `db_user` is None and accessing `.is_forbidden` would
    raise AttributeError. Returning a clean 4xx is friendlier.
    """
    if db_user is None:
        raise CustomException(
            message="WeChat user record exists, but the linked user was not found",
            code=404,
        )
    if db_user.is_forbidden:
        raise CustomException(message="User is forbidden", code=403)
    db_user.last_login_ip = ip
    db_user.last_login_time = datetime.now(timezone.utc)
    await db.commit()


MFA_CHALLENGE_TTL_SECONDS = 5 * 60
MFA_CHALLENGE_KEY_PREFIX = "mfa:login:"


def _mfa_challenge_key(challenge_id: str) -> str:
    return f"{MFA_CHALLENGE_KEY_PREFIX}{challenge_id}"


async def consume_mfa_login_challenge(
    cache: Redis,
    challenge_id: str,
) -> dict | None:
    raw_payload = await cache.get(_mfa_challenge_key(challenge_id))
    if raw_payload is None:
        return None
    await cache.delete(_mfa_challenge_key(challenge_id))
    if isinstance(raw_payload, bytes):
        raw_payload = raw_payload.decode("utf-8")
    return json.loads(raw_payload)


async def issue_tokens_or_create_mfa_challenge(
    *,
    db: AsyncSession,
    cache: Redis,
    user: models.user.User,
    first_factor_method: str,
    ip: str | None,
) -> schemas.user.AuthResponse:
    if user.is_forbidden:
        raise CustomException(message="User is forbidden", code=403)
    user.last_login_ip = ip
    user.last_login_time = datetime.now(timezone.utc)

    passkeys = await crud.user.get_webauthn_credentials_by_user_id_async(
        db=db,
        user_id=user.id,
    )
    totp_credential = await crud.user.get_totp_credential_by_user_id_async(
        db=db,
        user_id=user.id,
    )
    methods = []
    if passkeys:
        methods.append("passkey")
    if totp_credential is not None:
        methods.append("totp")

    if user.mfa_enabled and methods:
        await db.commit()
        challenge_id = new_challenge_id()
        await cache.set(
            name=_mfa_challenge_key(challenge_id),
            value=json.dumps({
                "user_id": user.id,
                "first_factor_method": first_factor_method,
                "ip": ip,
            }),
            ex=MFA_CHALLENGE_TTL_SECONDS,
        )
        return schemas.user.AuthResponse(
            mfa_required=True,
            challenge_id=challenge_id,
            methods=methods,
        )

    await db.commit()
    access_token, refresh_token = create_token(user)
    return schemas.user.AuthResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=3600,
    )


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
