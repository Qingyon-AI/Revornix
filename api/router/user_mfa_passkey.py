import json
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Request
from redis import Redis
from sqlalchemy.ext.asyncio import AsyncSession

import crud
import models
import schemas
from common.dependencies import get_async_db, get_cache, get_current_user, get_real_ip
from common.jwt_utils import create_token
from common.passkey import (
    bytes_to_base64url,
    generate_passkey_authentication_options,
    generate_passkey_registration_options,
    new_challenge_id,
    verify_passkey_authentication,
    verify_passkey_registration,
)
from data.sql.base import async_session_context
from schemas.error import CustomException


user_mfa_passkey_router = APIRouter()

PASSKEY_CHALLENGE_TTL_SECONDS = 5 * 60
PASSKEY_REGISTER_KEY_PREFIX = "webauthn:register:"
PASSKEY_AUTH_KEY_PREFIX = "webauthn:auth:"


def _register_key(challenge_id: str) -> str:
    return f"{PASSKEY_REGISTER_KEY_PREFIX}{challenge_id}"


def _auth_key(challenge_id: str) -> str:
    return f"{PASSKEY_AUTH_KEY_PREFIX}{challenge_id}"


async def _get_cached_json(cache: Redis, key: str) -> dict | None:
    raw_payload = await cache.get(key)
    if raw_payload is None:
        return None
    if isinstance(raw_payload, bytes):
        raw_payload = raw_payload.decode("utf-8")
    return json.loads(raw_payload)


def _normalize_device_type(value: object) -> str | None:
    if value is None:
        return None
    enum_value = getattr(value, "value", None)
    if isinstance(enum_value, str):
        return enum_value
    return str(value)


def _credential_to_info(
    credential: models.user.UserWebAuthnCredential,
) -> schemas.user.PasskeyInfo:
    return schemas.user.PasskeyInfo(
        id=credential.id,
        name=credential.name,
        device_type=credential.device_type,
        backed_up=credential.backed_up,
        last_used_at=credential.last_used_at,
        create_time=credential.create_time,
    )


@user_mfa_passkey_router.post(
    "/mfa/passkey/list",
    response_model=list[schemas.user.PasskeyInfo],
)
async def list_passkeys(
    user: models.user.User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_db),
):
    credentials = await crud.user.get_webauthn_credentials_by_user_id_async(
        db=db,
        user_id=user.id,
    )
    return [_credential_to_info(item) for item in credentials]


@user_mfa_passkey_router.post(
    "/mfa/passkey/register/options",
    response_model=schemas.user.PasskeyRegistrationOptionsResponse,
)
async def create_passkey_registration_options(
    request: Request,
    user: models.user.User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_db),
    cache: Redis = Depends(get_cache),
):
    credentials = await crud.user.get_webauthn_credentials_by_user_id_async(
        db=db,
        user_id=user.id,
    )
    options = generate_passkey_registration_options(
        request=request,
        user=user,
        existing_credentials=credentials,
    )
    challenge_id = new_challenge_id()
    await cache.set(
        name=_register_key(challenge_id),
        value=json.dumps({
            "user_id": user.id,
            "challenge": options["challenge"],
        }),
        ex=PASSKEY_CHALLENGE_TTL_SECONDS,
    )
    return schemas.user.PasskeyRegistrationOptionsResponse(
        challenge_id=challenge_id,
        options=options,
    )


@user_mfa_passkey_router.post(
    "/mfa/passkey/register/verify",
    response_model=schemas.user.TokenResponse,
)
async def verify_passkey_registration_endpoint(
    request: Request,
    request_body: schemas.user.PasskeyRegistrationVerifyRequest,
    user: models.user.User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_db),
    cache: Redis = Depends(get_cache),
):
    cached = await _get_cached_json(cache, _register_key(request_body.challenge_id))
    if cached is None or cached.get("user_id") != user.id:
        raise CustomException(message="Passkey registration challenge has expired", code=400)
    await cache.delete(_register_key(request_body.challenge_id))

    try:
        verification = verify_passkey_registration(
            request=request,
            credential=request_body.credential,
            expected_challenge=cached["challenge"],
        )
    except Exception as exc:
        raise CustomException(message="Passkey registration failed", code=400) from exc

    credential_id = bytes_to_base64url(verification.credential_id)
    existing = await crud.user.get_webauthn_credential_by_credential_id_async(
        db=db,
        credential_id=credential_id,
    )
    if existing is not None:
        raise CustomException(message="This passkey is already registered", code=400)

    transports = request_body.credential.get("response", {}).get("transports")
    if isinstance(transports, list):
        transports_value = ",".join(str(item) for item in transports)
    else:
        transports_value = None

    await crud.user.create_webauthn_credential_async(
        db=db,
        user_id=user.id,
        credential_id=credential_id,
        public_key=bytes_to_base64url(verification.credential_public_key),
        sign_count=verification.sign_count,
        device_type=_normalize_device_type(verification.credential_device_type),
        backed_up=bool(verification.credential_backed_up),
        transports=transports_value,
        name=(request_body.name or "Passkey")[:100],
    )
    await db.commit()
    access_token, refresh_token = create_token(user)
    return schemas.user.TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=3600,
    )


@user_mfa_passkey_router.post(
    "/mfa/passkey/auth/options",
    response_model=schemas.user.PasskeyAuthenticationOptionsResponse,
)
async def create_passkey_authentication_options(
    request: Request,
    request_body: schemas.user.PasskeyAuthenticationOptionsRequest,
    cache: Redis = Depends(get_cache),
):
    login_challenge = await _get_cached_json(
        cache,
        f"mfa:login:{request_body.challenge_id}",
    )
    if login_challenge is None:
        raise CustomException(message="MFA challenge has expired", code=400)

    user_id = login_challenge.get("user_id")
    async with async_session_context() as db:
        credentials = await crud.user.get_webauthn_credentials_by_user_id_async(
            db=db,
            user_id=user_id,
        )
    if not credentials:
        raise CustomException(message="No passkey is registered for this user", code=400)

    options = generate_passkey_authentication_options(
        request=request,
        credentials=credentials,
    )
    challenge_id = new_challenge_id()
    await cache.set(
        name=_auth_key(challenge_id),
        value=json.dumps({
            "mfa_challenge_id": request_body.challenge_id,
            "user_id": user_id,
            "challenge": options["challenge"],
        }),
        ex=PASSKEY_CHALLENGE_TTL_SECONDS,
    )
    return schemas.user.PasskeyAuthenticationOptionsResponse(
        challenge_id=challenge_id,
        options=options,
    )


@user_mfa_passkey_router.post(
    "/mfa/passkey/auth/verify",
    response_model=schemas.user.TokenResponse,
)
async def verify_passkey_authentication_endpoint(
    request: Request,
    request_body: schemas.user.PasskeyAuthenticationVerifyRequest,
    cache: Redis = Depends(get_cache),
    ip: str | None = Depends(get_real_ip),
):
    cached = await _get_cached_json(cache, _auth_key(request_body.challenge_id))
    if cached is None:
        raise CustomException(message="Passkey authentication challenge has expired", code=400)

    mfa_challenge = await _get_cached_json(
        cache,
        f"mfa:login:{cached['mfa_challenge_id']}",
    )
    if mfa_challenge is None or mfa_challenge.get("user_id") != cached.get("user_id"):
        await cache.delete(_auth_key(request_body.challenge_id))
        raise CustomException(message="MFA challenge has expired", code=400)

    credential_id = request_body.credential.get("id")
    if not isinstance(credential_id, str):
        raise CustomException(message="Passkey credential id is missing", code=400)

    async with async_session_context() as db:
        stored_credential = await crud.user.get_webauthn_credential_by_credential_id_async(
            db=db,
            credential_id=credential_id,
        )
        if stored_credential is None or stored_credential.user_id != cached.get("user_id"):
            raise CustomException(message="Passkey credential was not found", code=400)

        try:
            verification = verify_passkey_authentication(
                request=request,
                credential=request_body.credential,
                expected_challenge=cached["challenge"],
                stored_credential=stored_credential,
            )
        except Exception as exc:
            raise CustomException(message="Passkey authentication failed", code=400) from exc

        await crud.user.update_webauthn_credential_after_auth_async(
            db=db,
            credential=stored_credential,
            sign_count=verification.new_sign_count,
            device_type=_normalize_device_type(verification.credential_device_type),
            backed_up=bool(verification.credential_backed_up),
        )
        db_user = await crud.user.get_user_by_id_async(
            db=db,
            user_id=stored_credential.user_id,
        )
        if db_user is None:
            raise CustomException(message="User was not found", code=404)
        if db_user.is_forbidden:
            raise CustomException(message="User is forbidden", code=403)
        db_user.last_login_ip = ip
        db_user.last_login_time = datetime.now(timezone.utc)
        await db.commit()
        await cache.delete(f"mfa:login:{cached['mfa_challenge_id']}")
        await cache.delete(_auth_key(request_body.challenge_id))
        access_token, refresh_token = create_token(db_user)
        return schemas.user.TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            expires_in=3600,
        )


@user_mfa_passkey_router.post(
    "/mfa/passkey/delete",
    response_model=schemas.user.TokenResponse,
)
async def delete_passkey(
    request_body: schemas.user.PasskeyDeleteRequest,
    user: models.user.User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_db),
):
    db_user = await crud.user.get_user_by_id_async(db=db, user_id=user.id)
    if db_user is None:
        raise CustomException(message="User was not found", code=404)
    credentials = await crud.user.get_webauthn_credentials_by_user_id_async(
        db=db,
        user_id=db_user.id,
    )
    if not any(item.id == request_body.credential_id for item in credentials):
        raise CustomException(message="Passkey was not found", code=404)
    if db_user.mfa_enabled:
        totp_credential = await crud.user.get_totp_credential_by_user_id_async(
            db=db,
            user_id=db_user.id,
        )
        if len(credentials) <= 1 and totp_credential is None:
            raise CustomException(
                message="Disable MFA or add another MFA method before removing the last one",
                code=400,
            )
    await crud.user.delete_webauthn_credential_async(
        db=db,
        user_id=db_user.id,
        credential_id=request_body.credential_id,
    )
    await db.commit()
    access_token, refresh_token = create_token(db_user)
    return schemas.user.TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=3600,
    )
