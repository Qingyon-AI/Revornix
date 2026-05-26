import base64
import json
import os
import secrets
from dataclasses import dataclass
from urllib.parse import urlparse

from fastapi import Request

import models
from schemas.error import CustomException


RP_NAME = os.environ.get("WEBAUTHN_RP_NAME", "Revornix")
ALLOWED_ORIGINS = [
    origin.strip().rstrip("/")
    for origin in os.environ.get("WEBAUTHN_ALLOWED_ORIGINS", "").split(",")
    if origin.strip()
]


@dataclass(frozen=True)
class WebAuthnContext:
    rp_id: str
    origin: str


def _require_webauthn():
    try:
        import webauthn
        from webauthn.helpers import options_to_json
        from webauthn.helpers.structs import (
            AttestationConveyancePreference,
            AuthenticatorSelectionCriteria,
            PublicKeyCredentialDescriptor,
            ResidentKeyRequirement,
            UserVerificationRequirement,
        )
    except Exception as exc:
        raise CustomException(
            message="Passkey support is not installed. Install the 'webauthn' Python package.",
            code=500,
        ) from exc
    return (
        webauthn,
        options_to_json,
        AttestationConveyancePreference,
        AuthenticatorSelectionCriteria,
        PublicKeyCredentialDescriptor,
        ResidentKeyRequirement,
        UserVerificationRequirement,
    )


def bytes_to_base64url(value: bytes) -> str:
    return base64.urlsafe_b64encode(value).decode("ascii").rstrip("=")


def base64url_to_bytes(value: str) -> bytes:
    padding = "=" * (-len(value) % 4)
    return base64.urlsafe_b64decode(value + padding)


def new_challenge_id() -> str:
    return secrets.token_urlsafe(32)


def get_webauthn_context(request: Request) -> WebAuthnContext:
    raw_origin = request.headers.get("origin")
    if not raw_origin:
        referer = request.headers.get("referer")
        if referer:
            parsed_referer = urlparse(referer)
            raw_origin = f"{parsed_referer.scheme}://{parsed_referer.netloc}"
    if not raw_origin:
        raw_origin = f"{request.url.scheme}://{request.url.netloc}"

    parsed_origin = urlparse(raw_origin)
    if not parsed_origin.scheme or not parsed_origin.netloc:
        raise CustomException(message="Invalid WebAuthn origin", code=400)
    origin = f"{parsed_origin.scheme}://{parsed_origin.netloc}"
    if ALLOWED_ORIGINS and origin not in ALLOWED_ORIGINS:
        raise CustomException(message="WebAuthn origin is not allowed", code=400)

    rp_id = parsed_origin.hostname
    if not rp_id:
        raise CustomException(message="Invalid WebAuthn RP ID", code=400)

    return WebAuthnContext(
        rp_id=rp_id,
        origin=origin,
    )


def generate_passkey_registration_options(
    *,
    request: Request,
    user: models.user.User,
    existing_credentials: list[models.user.UserWebAuthnCredential],
) -> dict:
    (
        webauthn,
        options_to_json,
        AttestationConveyancePreference,
        AuthenticatorSelectionCriteria,
        PublicKeyCredentialDescriptor,
        ResidentKeyRequirement,
        UserVerificationRequirement,
    ) = _require_webauthn()
    context = get_webauthn_context(request)

    options = webauthn.generate_registration_options(
        rp_id=context.rp_id,
        rp_name=RP_NAME,
        user_id=f"revornix:{user.uuid}".encode("utf-8"),
        user_name=user.nickname,
        user_display_name=user.nickname,
        attestation=AttestationConveyancePreference.NONE,
        authenticator_selection=AuthenticatorSelectionCriteria(
            resident_key=ResidentKeyRequirement.PREFERRED,
            user_verification=UserVerificationRequirement.REQUIRED,
        ),
        exclude_credentials=[
            PublicKeyCredentialDescriptor(id=base64url_to_bytes(item.credential_id))
            for item in existing_credentials
        ],
    )
    return json.loads(options_to_json(options))


def verify_passkey_registration(
    *,
    request: Request,
    credential: dict,
    expected_challenge: str,
    expected_rp_id: str | None = None,
    expected_origin: str | None = None,
):
    webauthn, *_ = _require_webauthn()
    context = get_webauthn_context(request)
    rp_id = expected_rp_id or context.rp_id
    origin = expected_origin or context.origin
    if context.rp_id != rp_id or context.origin != origin:
        raise CustomException(message="WebAuthn challenge origin does not match", code=400)
    return webauthn.verify_registration_response(
        credential=credential,
        expected_challenge=base64url_to_bytes(expected_challenge),
        expected_rp_id=rp_id,
        expected_origin=origin,
        require_user_verification=True,
    )


def generate_passkey_authentication_options(
    *,
    request: Request,
    credentials: list[models.user.UserWebAuthnCredential],
) -> dict:
    (
        webauthn,
        options_to_json,
        _AttestationConveyancePreference,
        _AuthenticatorSelectionCriteria,
        PublicKeyCredentialDescriptor,
        _ResidentKeyRequirement,
        UserVerificationRequirement,
    ) = _require_webauthn()
    context = get_webauthn_context(request)
    options = webauthn.generate_authentication_options(
        rp_id=context.rp_id,
        allow_credentials=[
            PublicKeyCredentialDescriptor(id=base64url_to_bytes(item.credential_id))
            for item in credentials
        ],
        user_verification=UserVerificationRequirement.REQUIRED,
    )
    return json.loads(options_to_json(options))


def verify_passkey_authentication(
    *,
    request: Request,
    credential: dict,
    expected_challenge: str,
    stored_credential: models.user.UserWebAuthnCredential,
    expected_rp_id: str | None = None,
    expected_origin: str | None = None,
):
    webauthn, *_ = _require_webauthn()
    context = get_webauthn_context(request)
    rp_id = expected_rp_id or context.rp_id
    origin = expected_origin or context.origin
    if context.rp_id != rp_id or context.origin != origin:
        raise CustomException(message="WebAuthn challenge origin does not match", code=400)
    return webauthn.verify_authentication_response(
        credential=credential,
        expected_challenge=base64url_to_bytes(expected_challenge),
        expected_rp_id=rp_id,
        expected_origin=origin,
        credential_public_key=base64url_to_bytes(stored_credential.public_key),
        credential_current_sign_count=stored_credential.sign_count,
        require_user_verification=True,
    )
