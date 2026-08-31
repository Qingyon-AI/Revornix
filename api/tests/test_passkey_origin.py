import sys
from types import ModuleType, SimpleNamespace
from urllib.parse import urlparse

import pytest

# 桩只借给下面这行 import(common.passkey 在模块级碰 models,而这组测试不想拉起
# 整个模型层)。**用完必须还回去**:sys.modules 是进程级共享,桩留在里面,
# 同一进程里随后 import 真 models 的测试(如 agent 工具清单)拿到的就是这个空壳。
models_stub = ModuleType("models")
models_stub.user = SimpleNamespace(User=object, UserWebAuthnCredential=object)
_real_models = sys.modules.get("models")
sys.modules["models"] = models_stub
try:
    from common.passkey import get_optional_webauthn_context, get_webauthn_context
finally:
    if _real_models is None:
        sys.modules.pop("models", None)
    else:
        sys.modules["models"] = _real_models

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
