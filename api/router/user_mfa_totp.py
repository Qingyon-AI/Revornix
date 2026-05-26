import json
from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from redis import Redis
from sqlalchemy.ext.asyncio import AsyncSession

import crud
import models
import schemas
from common.dependencies import get_async_db, get_cache, get_current_user, get_real_ip
from common.jwt_utils import create_token
from common.passkey import new_challenge_id
from common.totp import create_otpauth_uri, create_totp_secret, verify_totp_code
from data.sql.base import async_session_context
from schemas.error import CustomException


user_mfa_totp_router = APIRouter()

TOTP_CHALLENGE_TTL_SECONDS = 10 * 60
TOTP_REGISTER_KEY_PREFIX = "totp:register:"


def _register_key(challenge_id: str) -> str:
    return f"{TOTP_REGISTER_KEY_PREFIX}{challenge_id}"


async def _get_cached_json(cache: Redis, key: str) -> dict | None:
    raw_payload = await cache.get(key)
    if raw_payload is None:
        return None
    if isinstance(raw_payload, bytes):
        raw_payload = raw_payload.decode("utf-8")
    return json.loads(raw_payload)


def _totp_to_info(
    credential: models.user.UserTotpCredential | None,
) -> schemas.user.TotpInfo:
    if credential is None:
        return schemas.user.TotpInfo(enabled=False)
    return schemas.user.TotpInfo(
        enabled=True,
        name=credential.name,
        last_used_at=credential.last_used_at,
        create_time=credential.create_time,
    )


@user_mfa_totp_router.post(
    "/mfa/totp/status",
    response_model=schemas.user.TotpInfo,
)
async def get_totp_status(
    user: models.user.User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_db),
):
    credential = await crud.user.get_totp_credential_by_user_id_async(
        db=db,
        user_id=user.id,
    )
    return _totp_to_info(credential)


@user_mfa_totp_router.post(
    "/mfa/totp/register/options",
    response_model=schemas.user.TotpRegistrationOptionsResponse,
)
async def create_totp_registration_options(
    user: models.user.User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_db),
    cache: Redis = Depends(get_cache),
):
    existing = await crud.user.get_totp_credential_by_user_id_async(
        db=db,
        user_id=user.id,
    )
    if existing is not None:
        raise CustomException(message="Authenticator app is already enabled", code=400)

    secret = create_totp_secret()
    challenge_id = new_challenge_id()
    await cache.set(
        name=_register_key(challenge_id),
        value=json.dumps({
            "user_id": user.id,
            "secret": secret,
        }),
        ex=TOTP_CHALLENGE_TTL_SECONDS,
    )
    return schemas.user.TotpRegistrationOptionsResponse(
        challenge_id=challenge_id,
        secret=secret,
        otpauth_uri=create_otpauth_uri(secret=secret, account_name=user.nickname),
    )


@user_mfa_totp_router.post(
    "/mfa/totp/register/verify",
    response_model=schemas.user.TokenResponse,
)
async def verify_totp_registration(
    request_body: schemas.user.TotpRegistrationVerifyRequest,
    user: models.user.User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_db),
    cache: Redis = Depends(get_cache),
):
    cached = await _get_cached_json(cache, _register_key(request_body.challenge_id))
    if cached is None or cached.get("user_id") != user.id:
        raise CustomException(message="Authenticator setup challenge has expired", code=400)

    step = verify_totp_code(secret=cached["secret"], code=request_body.code)
    if step is None:
        raise CustomException(message="Invalid authenticator code", code=400)

    existing = await crud.user.get_totp_credential_by_user_id_async(
        db=db,
        user_id=user.id,
    )
    if existing is not None:
        await cache.delete(_register_key(request_body.challenge_id))
        raise CustomException(message="Authenticator app is already enabled", code=400)

    credential = await crud.user.create_totp_credential_async(
        db=db,
        user_id=user.id,
        secret=cached["secret"],
        name=(request_body.name or "Authenticator app")[:100],
    )
    await crud.user.update_totp_credential_after_auth_async(
        db=db,
        credential=credential,
        last_used_step=step,
    )
    await db.commit()
    await cache.delete(_register_key(request_body.challenge_id))
    access_token, refresh_token = create_token(user)
    return schemas.user.TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=3600,
    )


@user_mfa_totp_router.post(
    "/mfa/totp/auth/verify",
    response_model=schemas.user.TokenResponse,
)
async def verify_totp_authentication(
    request_body: schemas.user.TotpAuthenticationVerifyRequest,
    cache: Redis = Depends(get_cache),
    ip: str | None = Depends(get_real_ip),
):
    mfa_challenge_key = f"mfa:login:{request_body.challenge_id}"
    mfa_challenge = await _get_cached_json(cache, mfa_challenge_key)
    if mfa_challenge is None:
        raise CustomException(message="MFA challenge has expired", code=400)

    async with async_session_context() as db:
        user_id = mfa_challenge.get("user_id")
        credential = await crud.user.get_totp_credential_by_user_id_async(
            db=db,
            user_id=user_id,
        )
        if credential is None:
            raise CustomException(message="Authenticator app is not enabled", code=400)

        step = verify_totp_code(
            secret=credential.secret,
            code=request_body.code,
            last_used_step=credential.last_used_step,
        )
        if step is None:
            raise CustomException(message="Invalid authenticator code", code=400)

        db_user = await crud.user.get_user_by_id_async(db=db, user_id=user_id)
        if db_user is None:
            raise CustomException(message="User was not found", code=404)
        if db_user.is_forbidden:
            raise CustomException(message="User is forbidden", code=403)

        await crud.user.update_totp_credential_after_auth_async(
            db=db,
            credential=credential,
            last_used_step=step,
        )
        db_user.last_login_ip = ip
        db_user.last_login_time = datetime.now(timezone.utc)
        await db.commit()
        await cache.delete(mfa_challenge_key)
        access_token, refresh_token = create_token(db_user)
        return schemas.user.TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            expires_in=3600,
        )


@user_mfa_totp_router.post(
    "/mfa/totp/delete",
    response_model=schemas.user.TokenResponse,
)
async def delete_totp(
    user: models.user.User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_db),
):
    db_user = await crud.user.get_user_by_id_async(db=db, user_id=user.id)
    if db_user is None:
        raise CustomException(message="User was not found", code=404)
    credential = await crud.user.get_totp_credential_by_user_id_async(
        db=db,
        user_id=db_user.id,
    )
    if credential is None:
        raise CustomException(message="Authenticator app is not enabled", code=404)
    if db_user.mfa_enabled:
        passkeys = await crud.user.get_webauthn_credentials_by_user_id_async(
            db=db,
            user_id=db_user.id,
        )
        if not passkeys:
            raise CustomException(
                message="Disable MFA or add another MFA method before removing the last one",
                code=400,
            )

    await crud.user.delete_totp_credential_async(db=db, user_id=db_user.id)
    await db.commit()
    access_token, refresh_token = create_token(db_user)
    return schemas.user.TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=3600,
    )
