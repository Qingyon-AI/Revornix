from __future__ import annotations

import base64
import json
import os
import stat
import threading
import time
from collections.abc import Mapping
from pathlib import Path
from typing import TypedDict

from common.logger import info_logger
from config.base import BASE_DIR

try:
    from cryptography.hazmat.primitives.ciphers.aead import AESGCM

    AESGCM_AVAILABLE = True
except Exception:
    AESGCM = None  # type: ignore[assignment]
    AESGCM_AVAILABLE = False


class EncryptedPayload(TypedDict):
    version: int
    encrypted: bool
    algorithm: str
    nonce: str
    ciphertext: str


class YouTubeCookieManager:
    _cookie_text_cache: str | None = None
    _encryption_key_loaded: bool = False
    _encryption_key_cache: bytes | None = None
    _cookie_encrypt_aad: bytes = b"revornix:youtube:cookie:v1"
    _startup_auth_enabled: bool = False
    _lock = threading.Lock()

    @classmethod
    def _cookie_file(cls) -> Path:
        custom_path = os.getenv("YOUTUBE_CREDENTIAL_FILE", "").strip()
        if custom_path:
            return Path(custom_path).expanduser()
        return BASE_DIR / "temp" / "youtube_auth" / "cookie.json"

    @classmethod
    def _apply_secure_permissions(cls, path: Path, mode: int) -> None:
        try:
            os.chmod(path, mode)
        except OSError:
            return

    @classmethod
    def _decode_encryption_key(cls, raw_key: str) -> bytes | None:
        candidate = raw_key.strip().strip('"').strip("'")
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
                "AES-GCM dependency unavailable; YouTube cookie cache will not be persisted.",
            )
            return None

        raw_key = (
            os.getenv("YOUTUBE_CREDENTIAL_ENCRYPT_KEY")
            or os.getenv("BILIBILI_CREDENTIAL_ENCRYPT_KEY")
            or ""
        )
        if not str(raw_key).strip():
            info_logger.warning(
                (
                    "YouTube credential encryption key is missing "
                    "(set YOUTUBE_CREDENTIAL_ENCRYPT_KEY). "
                    "Cookie cache will not be persisted."
                ),
            )
            return None

        decoded = cls._decode_encryption_key(str(raw_key))
        if decoded is None:
            info_logger.warning(
                (
                    "YouTube credential encryption key format is invalid. "
                    "Use base64/hex key length 16, 24, or 32 bytes. "
                    "Cookie cache will not be persisted."
                ),
            )
            return None

        cls._encryption_key_cache = decoded
        return decoded

    @classmethod
    def _env_enabled(cls, key: str, default: bool) -> bool:
        value = os.getenv(key)
        if value is None:
            return default

        normalized = value.strip().lower()
        if normalized in {"1", "true", "yes", "on", "y"}:
            return True
        if normalized in {"0", "false", "no", "off", "n"}:
            return False
        return default

    @classmethod
    def _encrypt_payload(cls, payload: Mapping[str, object]) -> EncryptedPayload | None:
        key = cls._get_encryption_key()
        if key is None or AESGCM is None:
            return None

        plaintext = json.dumps(
            payload,
            ensure_ascii=False,
            separators=(",", ":"),
        ).encode("utf-8")
        nonce = os.urandom(12)
        ciphertext = AESGCM(key).encrypt(nonce, plaintext, cls._cookie_encrypt_aad)
        return {
            "version": 2,
            "encrypted": True,
            "algorithm": "AES-GCM",
            "nonce": base64.b64encode(nonce).decode("ascii"),
            "ciphertext": base64.b64encode(ciphertext).decode("ascii"),
        }

    @classmethod
    def _decrypt_payload(cls, encrypted_payload: Mapping[str, object]) -> dict[str, object] | None:
        key = cls._get_encryption_key()
        if key is None or AESGCM is None:
            return None

        try:
            nonce = base64.b64decode(str(encrypted_payload.get("nonce", "")), validate=True)
            ciphertext = base64.b64decode(
                str(encrypted_payload.get("ciphertext", "")),
                validate=True,
            )
            plaintext = AESGCM(key).decrypt(nonce, ciphertext, cls._cookie_encrypt_aad)
            payload_raw: object = json.loads(plaintext.decode("utf-8"))
        except Exception:
            info_logger.warning(
                "YouTube encrypted cookie cache cannot be decrypted; cookie re-import is required.",
            )
            return None

        if not isinstance(payload_raw, dict):
            return None

        payload: dict[str, object] = {}
        for key, value in payload_raw.items():
            if isinstance(key, str):
                payload[key] = value
        return payload

    @classmethod
    def _is_storage_path_secure(
        cls,
        cookie_file: Path,
        *,
        create_parent: bool,
    ) -> bool:
        cookie_dir = cookie_file.parent

        try:
            if create_parent:
                cookie_dir.mkdir(parents=True, exist_ok=True)
        except Exception:
            info_logger.warning(
                "Failed to create YouTube cookie directory; secure cookie cache disabled.",
            )
            return False

        if cookie_file.exists() and cookie_file.is_symlink():
            info_logger.warning(
                "YouTube cookie file is a symlink; refusing to read/write for safety.",
            )
            return False
        if cookie_dir.exists() and cookie_dir.is_symlink():
            info_logger.warning(
                "YouTube cookie directory is a symlink; refusing to read/write for safety.",
            )
            return False

        if cookie_dir.exists():
            cls._apply_secure_permissions(cookie_dir, 0o700)
            try:
                dir_mode = stat.S_IMODE(cookie_dir.stat().st_mode)
                if dir_mode & 0o077:
                    info_logger.warning(
                        "YouTube cookie directory permission is too broad; secure cookie cache disabled.",
                    )
                    return False
            except OSError:
                info_logger.warning(
                    "Failed to inspect YouTube cookie directory permissions.",
                )
                return False

        if cookie_file.exists():
            cls._apply_secure_permissions(cookie_file, 0o600)
            try:
                file_mode = stat.S_IMODE(cookie_file.stat().st_mode)
                if file_mode & 0o077:
                    info_logger.warning(
                        "YouTube cookie file permission is too broad; secure cookie cache disabled.",
                    )
                    return False
            except OSError:
                info_logger.warning(
                    "Failed to inspect YouTube cookie file permissions.",
                )
                return False

        return True

    @classmethod
    def _looks_like_cookie_text(cls, cookie_text: str) -> bool:
        text = cookie_text.strip()
        if not text:
            return False
        return "youtube.com" in text.lower()

    @classmethod
    def _load_cookie_text_from_disk(cls) -> str | None:
        cookie_file = cls._cookie_file()
        if not cookie_file.exists():
            return None
        if not cls._is_storage_path_secure(cookie_file, create_parent=False):
            return None

        try:
            raw_payload_obj: object = json.loads(cookie_file.read_text(encoding="utf-8"))
        except Exception:
            info_logger.info("YouTube cookie cache is unreadable, re-import is required.")
            return None

        if not isinstance(raw_payload_obj, dict):
            return None

        raw_payload: dict[str, object] = {}
        for key, value in raw_payload_obj.items():
            if isinstance(key, str):
                raw_payload[key] = value

        payload: dict[str, object] | None = raw_payload
        if bool(raw_payload.get("encrypted")):
            payload = cls._decrypt_payload(raw_payload)
            if payload is None:
                return None
        elif cls._get_encryption_key() is None:
            info_logger.warning(
                "Plaintext YouTube cookie cache detected but encryption key is unavailable. Ignoring plaintext cache for safety.",
            )
            return None

        cookie_text = str((payload or {}).get("cookie_text") or "").strip()
        if not cls._looks_like_cookie_text(cookie_text):
            return None
        return cookie_text

    @classmethod
    def _save_cookie_text_to_disk(cls, cookie_text: str) -> bool:
        encrypted_payload = cls._encrypt_payload(
            {
                "version": 1,
                "updated_at": int(time.time()),
                "cookie_text": cookie_text,
            }
        )
        if encrypted_payload is None:
            return False

        cookie_file = cls._cookie_file()
        if not cls._is_storage_path_secure(cookie_file, create_parent=True):
            return False

        tmp_file = cookie_file.with_suffix(f"{cookie_file.suffix}.tmp")
        tmp_file.write_text(
            json.dumps(encrypted_payload, ensure_ascii=False, separators=(",", ":")),
            encoding="utf-8",
        )
        cls._apply_secure_permissions(tmp_file, 0o600)
        os.replace(tmp_file, cookie_file)
        cls._apply_secure_permissions(cookie_file, 0o600)
        return True

    @classmethod
    def _read_cookie_text_from_import_file(cls) -> tuple[str | None, Path | None]:
        cookie_file_path = os.getenv("YOUTUBE_YTDLP_COOKIE_FILE", "").strip()
        if not cookie_file_path:
            return None, None

        cookie_file = Path(cookie_file_path).expanduser()
        if not cookie_file.exists():
            return None, None
        try:
            if cookie_file.is_symlink():
                info_logger.warning(
                    "YouTube import cookie file is a symlink; refusing to read for safety.",
                )
                return None, None
            cookie_text = cookie_file.read_text(encoding="utf-8")
        except Exception:
            info_logger.warning(
                "Failed to read YouTube import cookie file.",
            )
            return None, None

        if not cls._looks_like_cookie_text(cookie_text):
            info_logger.warning(
                "YouTube import cookie file appears invalid; expected Netscape cookie text with youtube.com entries.",
            )
            return None, None
        return cookie_text, cookie_file

    @classmethod
    def _delete_import_cookie_file(cls, cookie_file: Path) -> None:
        try:
            if cookie_file.is_symlink():
                info_logger.warning(
                    "YouTube import cookie file is a symlink; refusing to delete for safety.",
                )
                return
            if not cookie_file.exists():
                return
            cookie_file.unlink()
            info_logger.info("YouTube import cookie file deleted after encrypted import.")
        except Exception:
            info_logger.warning("Failed to delete YouTube import cookie file after encrypted import.")

    @classmethod
    def initialize_on_startup(cls) -> None:
        with cls._lock:
            cls._is_storage_path_secure(cls._cookie_file(), create_parent=True)
            cls._get_encryption_key()
            cls._startup_auth_enabled = cls._env_enabled("YOUTUBE_COOKIE_ON_STARTUP", False)
            if not cls._startup_auth_enabled:
                cls._cookie_text_cache = None
                info_logger.info(
                    "YouTube startup auth is disabled; subtitle fetch will run without YouTube cookies."
                )
                return

            imported_cookie_text, import_cookie_file = cls._read_cookie_text_from_import_file()
            if imported_cookie_text is not None:
                cls._cookie_text_cache = imported_cookie_text
                if cls._save_cookie_text_to_disk(imported_cookie_text):
                    info_logger.info("YouTube cookie imported and encrypted successfully.")
                    if import_cookie_file is not None:
                        cls._delete_import_cookie_file(import_cookie_file)
                else:
                    info_logger.info(
                        "YouTube cookie imported to memory, but encrypted persistence is unavailable."
                    )
                return

            cls._cookie_text_cache = cls._load_cookie_text_from_disk()
            if cls._cookie_text_cache:
                info_logger.info("YouTube encrypted cookie cache loaded successfully.")

    @classmethod
    def get_cookie_text_for_ytdlp(cls) -> str | None:
        with cls._lock:
            if not cls._startup_auth_enabled:
                return None

            cookie_text = cls._cookie_text_cache or cls._load_cookie_text_from_disk()
            if not cookie_text:
                return None

            cls._cookie_text_cache = cookie_text
            return cookie_text


async def initialize_youtube_auth_on_startup() -> None:
    try:
        YouTubeCookieManager.initialize_on_startup()
    except Exception:
        info_logger.info("YouTube auth initialization failed on startup.")
