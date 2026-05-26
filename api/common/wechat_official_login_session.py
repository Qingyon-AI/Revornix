"""In-process store for WeChat Official Account QR-code sessions.

Two flows share this module:

* **Login** (``kind='login'``) — anonymous user scans to sign in.
  ``user_id`` is unknown at creation and gets filled in when the scan event
  arrives.

* **Bind** (``kind='bind'``) — an already-authenticated Revornix user scans
  to attach their personal WeChat to the account. ``user_id`` is the *target*
  user, set at creation; the scan event fills in ``scanned_openid`` /
  ``scanned_unionid`` / ``scanned_nickname`` so the polling endpoint can run
  the actual binding with full error handling.

State machine for both kinds: ``pending → confirmed → consumed``.
"""

import secrets
import threading
import time
from dataclasses import dataclass
from typing import Literal


SceneKind = Literal["login", "bind"]
SceneStatus = Literal["pending", "confirmed", "consumed"]

LOGIN_SCENE_PREFIX = "login_"
BIND_SCENE_PREFIX = "bind_"
SCENE_TTL_SECONDS = 5 * 60


@dataclass(slots=True)
class WechatOfficialQrSession:
    scene_str: str
    kind: SceneKind
    created_at: float
    expires_at: float
    status: SceneStatus = "pending"
    # Login: resolved Revornix user after scan.
    # Bind:  target Revornix user, known at creation time.
    user_id: int | None = None
    # Bind-only: captured at scan time, consumed by the bind endpoint.
    scanned_openid: str | None = None
    scanned_unionid: str | None = None
    scanned_nickname: str | None = None


_sessions: dict[str, WechatOfficialQrSession] = {}
_lock = threading.Lock()


def _prune_locked(now: float) -> None:
    expired = [k for k, v in _sessions.items() if v.expires_at <= now]
    for k in expired:
        _sessions.pop(k, None)


def _new_scene_str(prefix: str) -> str:
    # 16 bytes hex = 32 chars, plus prefix stays under WeChat's 64-char limit.
    return f"{prefix}{secrets.token_hex(16)}"


def create_login_session(ttl_seconds: int = SCENE_TTL_SECONDS) -> WechatOfficialQrSession:
    now = time.time()
    session = WechatOfficialQrSession(
        scene_str=_new_scene_str(LOGIN_SCENE_PREFIX),
        kind="login",
        created_at=now,
        expires_at=now + ttl_seconds,
    )
    with _lock:
        _prune_locked(now)
        _sessions[session.scene_str] = session
    return session


def create_bind_session(
    *,
    user_id: int,
    ttl_seconds: int = SCENE_TTL_SECONDS,
) -> WechatOfficialQrSession:
    now = time.time()
    session = WechatOfficialQrSession(
        scene_str=_new_scene_str(BIND_SCENE_PREFIX),
        kind="bind",
        created_at=now,
        expires_at=now + ttl_seconds,
        user_id=user_id,
    )
    with _lock:
        _prune_locked(now)
        _sessions[session.scene_str] = session
    return session


def is_login_scene(scene_str: str | None) -> bool:
    return bool(scene_str) and scene_str.startswith(LOGIN_SCENE_PREFIX)


def is_bind_scene(scene_str: str | None) -> bool:
    return bool(scene_str) and scene_str.startswith(BIND_SCENE_PREFIX)


def detect_scene_kind(scene_str: str | None) -> SceneKind | None:
    if is_login_scene(scene_str):
        return "login"
    if is_bind_scene(scene_str):
        return "bind"
    return None


def get_session(scene_str: str) -> WechatOfficialQrSession | None:
    now = time.time()
    with _lock:
        _prune_locked(now)
        return _sessions.get(scene_str)


def confirm_login_session(scene_str: str, user_id: int) -> bool:
    """Mark a login scene as confirmed with the resolved Revornix user."""
    now = time.time()
    with _lock:
        _prune_locked(now)
        session = _sessions.get(scene_str)
        if session is None or session.kind != "login":
            return False
        if session.status == "consumed":
            return False
        session.status = "confirmed"
        session.user_id = user_id
        return True


def attach_bind_scan(
    *,
    scene_str: str,
    openid: str,
    unionid: str,
    nickname: str | None,
) -> bool:
    """Attach the scanned WeChat identity to a pending bind session."""
    now = time.time()
    with _lock:
        _prune_locked(now)
        session = _sessions.get(scene_str)
        if session is None or session.kind != "bind":
            return False
        if session.status == "consumed":
            return False
        session.scanned_openid = openid
        session.scanned_unionid = unionid
        session.scanned_nickname = nickname
        session.status = "confirmed"
        return True


def consume_session(scene_str: str) -> WechatOfficialQrSession | None:
    """Flip a confirmed session to ``consumed`` so it cannot be reused.

    Returns the session snapshot (still readable) regardless of whether the
    consume succeeded; callers should inspect ``status`` and the relevant
    fields before trusting it.
    """
    now = time.time()
    with _lock:
        _prune_locked(now)
        session = _sessions.get(scene_str)
        if session is None:
            return None
        if session.status != "confirmed":
            return session
        session.status = "consumed"
        return session
