from __future__ import annotations

import asyncio
import base64
import json
import os
import signal
import stat
import sys
import threading
import time
import weakref
from pathlib import Path
from typing import Any, TYPE_CHECKING, TypeAlias

from common.logger import info_logger

try:
    from cryptography.hazmat.primitives.ciphers.aead import AESGCM

    AESGCM_AVAILABLE = True
except Exception:
    AESGCM = None  # type: ignore[assignment]
    AESGCM_AVAILABLE = False

if TYPE_CHECKING:
    from bilibili_api import Credential as BiliCredential
else:
    BiliCredential: TypeAlias = Any

try:
    from bilibili_api import Credential as RuntimeCredential, login_v2

    BILIBILI_API_AVAILABLE = True
except Exception:
    RuntimeCredential = None  # type: ignore[assignment]
    login_v2 = None  # type: ignore[assignment]
    BILIBILI_API_AVAILABLE = False


def _default_credential_root_dir() -> Path:
    custom_root = os.getenv("REVORNIX_CREDENTIAL_DIR", "").strip()
    if custom_root:
        return Path(custom_root).expanduser()
    
    return Path.home() / ".local" / "state" / "revornix"


class BilibiliCredentialManager:
    _cookie_keys = (
        "SESSDATA",
        "bili_jct",
        "buvid3",
        "buvid4",
        "DedeUserID",
        "ac_time_value",
    )
    _credential: BiliCredential | None = None
    _last_checked_at: float = 0.0
    _check_interval_seconds: float = 300.0
    _encryption_key_loaded: bool = False
    _encryption_key_cache: bytes | None = None
    _startup_login_enabled: bool = False
    _credential_encrypt_aad: bytes = b"revornix:bilibili:credential:v1"
    _lock_by_loop: weakref.WeakKeyDictionary[asyncio.AbstractEventLoop, asyncio.Lock] = (
        weakref.WeakKeyDictionary()
    )
    _startup_task_by_loop: weakref.WeakKeyDictionary[
        asyncio.AbstractEventLoop, asyncio.Task[None]
    ] = weakref.WeakKeyDictionary()

    @classmethod
    def _get_lock(cls) -> asyncio.Lock:
        loop = asyncio.get_running_loop()
        lock = cls._lock_by_loop.get(loop)
        if lock is None:
            lock = asyncio.Lock()
            cls._lock_by_loop[loop] = lock
        return lock

    @classmethod
    def _env_enabled(cls, name: str, default: bool) -> bool:
        raw = os.getenv(name)
        if raw is None:
            return default
        return raw.strip().lower() in {"1", "true", "yes", "on", "True"}

    @classmethod
    def _qrcode_timeout_seconds(cls) -> float:
        raw = os.getenv("BILIBILI_QR_LOGIN_TIMEOUT_SECONDS", "300")
        try:
            return max(30.0, float(raw))
        except (TypeError, ValueError):
            return 300.0

    @classmethod
    def _qrcode_poll_timeout_seconds(cls) -> float:
        raw = os.getenv("BILIBILI_QR_LOGIN_POLL_TIMEOUT_SECONDS", "8")
        try:
            return min(30.0, max(1.0, float(raw)))
        except (TypeError, ValueError):
            return 8.0

    @classmethod
    def _install_interrupt_event(cls) -> tuple[asyncio.Event | None, dict[int, Any]]:
        if threading.current_thread() is not threading.main_thread():
            return None, {}

        stop_event = asyncio.Event()
        previous_handlers: dict[int, Any] = {}

        def _signal_handler(signum: int, frame: Any) -> None:
            stop_event.set()
            previous_handler = previous_handlers.get(signum)
            if callable(previous_handler):
                previous_handler(signum, frame)

        for sig in (signal.SIGINT, signal.SIGTERM):
            try:
                previous_handlers[sig] = signal.getsignal(sig)
                signal.signal(sig, _signal_handler)
            except Exception:
                previous_handlers.pop(sig, None)

        if not previous_handlers:
            return None, {}
        return stop_event, previous_handlers

    @classmethod
    def _restore_signal_handlers(cls, previous_handlers: dict[int, Any]) -> None:
        for sig, previous_handler in previous_handlers.items():
            try:
                signal.signal(sig, previous_handler)
            except Exception:
                continue

    @classmethod
    def _is_terminal_interactive(cls) -> bool:
        return bool(sys.stdin and sys.stdin.isatty() and sys.stdout and sys.stdout.isatty())

    @classmethod
    def _credential_file(cls) -> Path:
        custom_path = os.getenv("BILIBILI_CREDENTIAL_FILE", "").strip()
        if custom_path:
            return Path(custom_path).expanduser()

        return _default_credential_root_dir() / "bilibili_auth" / "credential.json"

    @classmethod
    def _normalize_cookies(cls, cookies: dict) -> dict[str, str]:
        normalized: dict[str, str] = {}
        for key in cls._cookie_keys:
            value = cookies.get(key)
            if value is None:
                continue
            value_text = str(value).strip()
            if value_text:
                normalized[key] = value_text
        return normalized

    @classmethod
    def _apply_secure_permissions(cls, path: Path, mode: int) -> None:
        try:
            os.chmod(path, mode)
        except OSError:
            return

    @classmethod
    def _decode_encryption_key(cls, raw_key: str) -> bytes | None:
        candidate = raw_key.strip().strip("\"").strip("'")
        if not candidate:
            return None

        try:
            decoded = base64.b64decode(candidate, validate=True)
            if len(decoded) in (16, 24, 32):
                return decoded
        except Exception:
            pass

        try:
            decoded = bytes.fromhex(candidate)
            if len(decoded) in (16, 24, 32):
                return decoded
        except Exception:
            pass

        try:
            padded = candidate + "=" * (-len(candidate) % 4)
            decoded = base64.b64decode(padded)
            if len(decoded) in (16, 24, 32):
                return decoded
        except Exception:
            pass

        return None

    @classmethod
    def _get_encryption_key(cls) -> bytes | None:
        if cls._encryption_key_loaded:
            return cls._encryption_key_cache

        cls._encryption_key_loaded = True
        cls._encryption_key_cache = None

        if not AESGCM_AVAILABLE or AESGCM is None:
            info_logger.warning(
                "AES-GCM dependency unavailable; Bilibili credential cache will not be persisted."
            )
            return None

        raw_key = (
            os.getenv("BILIBILI_CREDENTIAL_ENCRYPT_KEY")
            or ""
        )
        if not str(raw_key).strip():
            info_logger.warning(
                (
                    "Bilibili credential encryption key is missing "
                    "(set BILIBILI_CREDENTIAL_ENCRYPT_KEY). "
                    "Credential cache will not be persisted."
                ),
            )
            return None

        decoded = cls._decode_encryption_key(str(raw_key))
        if decoded is None:
            info_logger.warning(
                (
                    "Bilibili credential encryption key format is invalid. "
                    "Use base64/hex key length 16, 24, or 32 bytes. "
                    "Credential cache will not be persisted."
                )
            )
            return None

        cls._encryption_key_cache = decoded
        return decoded

    @classmethod
    def _encrypt_payload(cls, payload: dict[str, Any]) -> dict[str, Any] | None:
        key = cls._get_encryption_key()
        if key is None or AESGCM is None:
            return None

        plaintext = json.dumps(
            payload,
            ensure_ascii=False,
            separators=(",", ":"),
        ).encode("utf-8")
        nonce = os.urandom(12)
        ciphertext = AESGCM(key).encrypt(nonce, plaintext, cls._credential_encrypt_aad)
        return {
            "version": 2,
            "encrypted": True,
            "algorithm": "AES-GCM",
            "nonce": base64.b64encode(nonce).decode("ascii"),
            "ciphertext": base64.b64encode(ciphertext).decode("ascii"),
        }

    @classmethod
    def _decrypt_payload(cls, encrypted_payload: dict[str, Any]) -> dict[str, Any] | None:
        key = cls._get_encryption_key()
        if key is None or AESGCM is None:
            return None

        try:
            nonce = base64.b64decode(str(encrypted_payload.get("nonce", "")), validate=True)
            ciphertext = base64.b64decode(
                str(encrypted_payload.get("ciphertext", "")),
                validate=True,
            )
            plaintext = AESGCM(key).decrypt(nonce, ciphertext, cls._credential_encrypt_aad)
            payload = json.loads(plaintext.decode("utf-8"))
        except Exception:
            info_logger.warning(
                "Bilibili encrypted credential cache cannot be decrypted; re-login is required.",
            )
            return None

        return payload if isinstance(payload, dict) else None

    @classmethod
    def _is_storage_path_secure(
        cls,
        credential_file: Path,
        *,
        create_parent: bool,
    ) -> bool:
        credential_dir = credential_file.parent

        try:
            if create_parent:
                credential_dir.mkdir(parents=True, exist_ok=True)
        except Exception:
            info_logger.warning(
                "Failed to create Bilibili credential directory; credential cache disabled.",
            )
            return False

        if credential_file.exists() and credential_file.is_symlink():
            info_logger.warning(
                "Bilibili credential file is a symlink; refusing to read/write for safety.",
            )
            return False
        if credential_dir.exists() and credential_dir.is_symlink():
            info_logger.warning(
                "Bilibili credential directory is a symlink; refusing to read/write for safety.",
            )
            return False

        if credential_dir.exists():
            cls._apply_secure_permissions(credential_dir, 0o700)
            try:
                dir_mode = stat.S_IMODE(credential_dir.stat().st_mode)
                if dir_mode & 0o077:
                    info_logger.warning(
                        "Bilibili credential directory permission is too broad; credential cache disabled.",
                    )
                    return False
            except OSError:
                info_logger.warning(
                    "Failed to inspect Bilibili credential directory permissions.",
                )
                return False

        if credential_file.exists():
            cls._apply_secure_permissions(credential_file, 0o600)
            try:
                file_mode = stat.S_IMODE(credential_file.stat().st_mode)
                if file_mode & 0o077:
                    info_logger.warning(
                        "Bilibili credential file permission is too broad; credential cache disabled.",
                    )
                    return False
            except OSError:
                info_logger.warning(
                    "Failed to inspect Bilibili credential file permissions.",
                )
                return False

        return True

    @classmethod
    def _load_credential_from_disk(cls) -> BiliCredential | None:
        credential_file = cls._credential_file()
        if not credential_file.exists():
            return None
        if not cls._is_storage_path_secure(credential_file, create_parent=False):
            return None

        try:
            raw_payload = json.loads(credential_file.read_text(encoding="utf-8"))
        except Exception:
            info_logger.info("Bilibili credential cache is unreadable, login will be required again.")
            return None

        if not isinstance(raw_payload, dict):
            return None

        payload: dict[str, Any] | None = raw_payload
        migrate_plaintext_payload = False
        if bool(raw_payload.get("encrypted")):
            payload = cls._decrypt_payload(raw_payload)
            if payload is None:
                return None
        else:
            if cls._get_encryption_key() is None:
                info_logger.warning(
                    (
                        "Plaintext Bilibili credential cache detected but encryption key is unavailable. "
                        "Ignoring plaintext cache for safety."
                    )
                )
                return None
            migrate_plaintext_payload = True

        raw_cookies = payload.get("cookies") if "cookies" in payload else payload
        if not isinstance(raw_cookies, dict):
            return None

        cookies = cls._normalize_cookies(raw_cookies)
        if not cookies:
            return None

        if RuntimeCredential is None:
            return None

        credential = RuntimeCredential.from_cookies(cookies)
        if not credential.has_sessdata():
            return None

        if migrate_plaintext_payload:
            cls._save_credential_to_disk(credential)
        return credential

    @classmethod
    def _save_credential_to_disk(cls, credential: BiliCredential) -> None:
        encrypted_payload = cls._encrypt_payload(
            {
                "version": 1,
                "updated_at": int(time.time()),
                "cookies": cls._normalize_cookies(credential.get_cookies()),
            }
        )
        if encrypted_payload is None:
            return

        credential_file = cls._credential_file()
        if not cls._is_storage_path_secure(credential_file, create_parent=True):
            return

        tmp_file = credential_file.with_suffix(f"{credential_file.suffix}.tmp")
        tmp_file.write_text(
            json.dumps(encrypted_payload, ensure_ascii=False, separators=(",", ":")),
            encoding="utf-8",
        )
        cls._apply_secure_permissions(tmp_file, 0o600)
        os.replace(tmp_file, credential_file)
        cls._apply_secure_permissions(credential_file, 0o600)

    @classmethod
    async def _safe_check_valid(cls, credential: BiliCredential) -> bool:
        try:
            return bool(await credential.check_valid())
        except Exception:
            return False

    @classmethod
    async def _safe_refresh(cls, credential: BiliCredential) -> bool:
        if not credential.has_bili_jct() or not credential.has_ac_time_value():
            return False

        try:
            await credential.refresh()
        except Exception:
            return False

        return await cls._safe_check_valid(credential)

    @classmethod
    async def _refresh_if_needed(cls, credential: BiliCredential) -> bool:
        if not credential.has_bili_jct() or not credential.has_ac_time_value():
            return False

        try:
            needs_refresh = bool(await credential.check_refresh())
        except Exception:
            needs_refresh = False

        if not needs_refresh:
            return False

        try:
            await credential.refresh()
        except Exception:
            return False

        return await cls._safe_check_valid(credential)

    @classmethod
    async def _ensure_valid_credential(
        cls,
        credential: BiliCredential,
        *,
        force_check: bool,
    ) -> bool:
        now = time.time()
        if (
            not force_check
            and cls._last_checked_at > 0
            and now - cls._last_checked_at < cls._check_interval_seconds
            and credential.has_sessdata()
        ):
            return True

        if await cls._safe_check_valid(credential):
            refreshed = await cls._refresh_if_needed(credential)
            cls._last_checked_at = time.time()
            if refreshed:
                cls._save_credential_to_disk(credential)
            return True

        if await cls._safe_refresh(credential):
            cls._last_checked_at = time.time()
            cls._save_credential_to_disk(credential)
            return True

        return False

    @classmethod
    async def _qrcode_login(cls) -> BiliCredential | None:
        if login_v2 is None:
            info_logger.info(
                "bilibili-api-python is unavailable, login-required Bilibili subtitles are disabled."
            )
            return None

        if not cls._is_terminal_interactive():
            info_logger.info("Bilibili QR login skipped because terminal is not interactive.")
            return None

        login_module = login_v2
        print("[Bilibili] 首次登录需要扫码，请使用哔哩哔哩 App 扫描下方二维码：")
        qr = login_module.QrCodeLogin(platform=login_module.QrCodeLoginChannel.WEB)
        await qr.generate_qrcode()
        print(qr.get_qrcode_terminal())

        deadline = time.monotonic() + cls._qrcode_timeout_seconds()
        scan_notified = False
        interrupt_event, previous_handlers = cls._install_interrupt_event()

        try:
            while time.monotonic() < deadline:
                if interrupt_event is not None and interrupt_event.is_set():
                    print("[Bilibili] 收到中断信号，已取消扫码登录。")
                    info_logger.info("Bilibili QR login interrupted by signal.")
                    return None

                try:
                    state = await asyncio.wait_for(
                        qr.check_state(),
                        timeout=cls._qrcode_poll_timeout_seconds(),
                    )
                except asyncio.TimeoutError:
                    continue

                if qr.has_done():
                    print("[Bilibili] 登录成功。")
                    return qr.get_credential()

                if state == login_module.QrCodeLoginEvents.CONF and not scan_notified:
                    print("[Bilibili] 已扫码，请在手机上确认登录。")
                    scan_notified = True
                elif state == login_module.QrCodeLoginEvents.SCAN:
                    scan_notified = False
                elif state == login_module.QrCodeLoginEvents.TIMEOUT:
                    print("[Bilibili] 二维码过期，已重新生成：")
                    await qr.generate_qrcode()
                    print(qr.get_qrcode_terminal())
                    scan_notified = False

                await asyncio.sleep(1.0)
        finally:
            cls._restore_signal_handlers(previous_handlers)

        info_logger.info("Bilibili QR login timeout.")
        return None

    @classmethod
    async def ensure_credential(
        cls,
        *,
        allow_qr_login: bool,
        force_check: bool,
    ) -> BiliCredential | None:
        if not BILIBILI_API_AVAILABLE or RuntimeCredential is None or login_v2 is None:
            info_logger.info(
                "bilibili-api-python is unavailable, login-required Bilibili subtitles are disabled."
            )
            return None

        async with cls._get_lock():
            credential = cls._credential or cls._load_credential_from_disk()
            if credential is not None:
                if await cls._ensure_valid_credential(credential, force_check=force_check):
                    cls._credential = credential
                    return credential
                cls._credential = None

            if not allow_qr_login:
                return None

            credential = await cls._qrcode_login()
            if credential is None:
                return None

            if not await cls._ensure_valid_credential(credential, force_check=True):
                return None

            cls._credential = credential
            cls._save_credential_to_disk(credential)
            return credential

    @classmethod
    async def initialize_on_startup(cls) -> None:
        cls._is_storage_path_secure(cls._credential_file(), create_parent=True)
        cls._get_encryption_key()
        cls._startup_login_enabled = cls._env_enabled("BILIBILI_QR_LOGIN_ON_STARTUP", False)
        if not cls._startup_login_enabled:
            cls._credential = None
            info_logger.info(
                "Bilibili startup login is disabled; login-required subtitles will be skipped."
            )
            return

        loop = asyncio.get_running_loop()
        existing_task = cls._startup_task_by_loop.get(loop)
        if existing_task is not None and not existing_task.done():
            info_logger.info("Bilibili startup auth task is already running.")
            return

        async def _run_startup_auth() -> None:
            try:
                await cls.ensure_credential(
                    allow_qr_login=True,
                    force_check=True,
                )
            except Exception:
                info_logger.info("Bilibili auth initialization failed on startup.")
            finally:
                current_task = asyncio.current_task()
                saved_task = cls._startup_task_by_loop.get(loop)
                if current_task is not None and saved_task is current_task:
                    cls._startup_task_by_loop.pop(loop, None)

        startup_task = asyncio.create_task(
            _run_startup_auth(),
            name="bilibili-startup-auth",
        )
        cls._startup_task_by_loop[loop] = startup_task
        info_logger.info(
            "Bilibili startup auth scheduled in background; FastAPI startup will not wait for QR login."
        )

    @classmethod
    async def get_cookie_header_for_login_required_subtitle(cls) -> str | None:
        if not cls._startup_login_enabled:
            return None

        credential = await cls.ensure_credential(
            allow_qr_login=False,
            force_check=False,
        )
        if credential is None:
            return None

        cookies = cls._normalize_cookies(credential.get_cookies())
        if not cookies:
            return None

        cookie_parts = [f"{key}={cookies[key]}" for key in cls._cookie_keys if key in cookies]
        return "; ".join(cookie_parts) if cookie_parts else None


async def initialize_bilibili_auth_on_startup() -> None:
    try:
        await BilibiliCredentialManager.initialize_on_startup()
    except Exception:
        info_logger.info("Bilibili auth initialization failed on startup.")
