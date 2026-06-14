import sys
from types import ModuleType, SimpleNamespace
from urllib.parse import urlparse

import pytest

models_stub = ModuleType("models")
models_stub.user = SimpleNamespace(User=object, UserWebAuthnCredential=object)
sys.modules.setdefault("models", models_stub)

from common.passkey import get_optional_webauthn_context, get_webauthn_context
from schemas.error import CustomException


def _request(origin: str | None = None, url: str = "https://api.revornix.cn/user/login"):
    headers = {}
    if origin is not None:
        headers["origin"] = origin
    return SimpleNamespace(headers=headers, url=urlparse(url))


def test_get_webauthn_context_rejects_disallowed_origin(monkeypatch):
    monkeypatch.setattr("common.passkey.ALLOWED_ORIGINS", ["https://app.revornix.com"])

    with pytest.raises(CustomException) as exc_info:
        get_webauthn_context(_request())

    assert exc_info.value.message == "WebAuthn origin is not allowed"


def test_optional_webauthn_context_ignores_disallowed_origin(monkeypatch):
    monkeypatch.setattr("common.passkey.ALLOWED_ORIGINS", ["https://app.revornix.com"])

    assert get_optional_webauthn_context(_request()) is None


def test_optional_webauthn_context_accepts_allowed_origin(monkeypatch):
    monkeypatch.setattr("common.passkey.ALLOWED_ORIGINS", ["https://app.revornix.com"])

    context = get_optional_webauthn_context(_request(origin="https://app.revornix.com"))

    assert context is not None
    assert context.origin == "https://app.revornix.com"
    assert context.rp_id == "app.revornix.com"
