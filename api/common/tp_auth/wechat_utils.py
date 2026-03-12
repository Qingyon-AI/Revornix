import base64
import os
import secrets
import threading
import time

from dataclasses import dataclass
from hashlib import sha1
from hmac import compare_digest
from struct import pack, unpack

import httpx
from cryptography.hazmat.primitives import padding
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from pydantic import BaseModel

from common.logger import exception_logger

# WeChat official account safe mode uses PKCS7 padding with a 32-byte block size.
WECHAT_AES_BLOCK_SIZE = 256


class WebWeChatTokenResponse(BaseModel):
    access_token: str
    expires_in: int
    refresh_token: str
    openid: str
    scope: str
    unionid: str

class MiniWeChatTokenResponse(BaseModel):
    session_key: str
    openid: str
    unionid: str | None = None
    errmsg: str | None = None
    errcode: int | None = None

class OfficialWeChatAccessTokenResponse(BaseModel):
    access_token: str
    expires_in: int
    errcode: int | None = None
    errmsg: str | None = None

class OfficialWeChatUserInfoResponse(BaseModel):
    subscribe: int | None = None
    openid: str
    nickname: str | None = None
    sex: int | None = None
    language: str | None = None
    city: str | None = None
    province: str | None = None
    country: str | None = None
    headimgurl: str | None = None
    subscribe_time: int | None = None
    unionid: str | None = None
    remark: str | None = None
    groupid: int | None = None
    tagid_list: list[int] | None = None
    errcode: int | None = None
    errmsg: str | None = None

@dataclass(slots=True)
class WeChatMediaDownload:
    content: bytes
    content_type: str | None = None
    file_name: str | None = None


@dataclass(slots=True)
class WeChatCryptoConfig:
    token: str
    app_id: str
    encoding_aes_key: str


_official_access_token_cache: dict[str, tuple[str, float]] = {}
_official_access_token_lock = threading.Lock()


def _get_timeout() -> float:
    timeout_raw = os.environ.get("WECHAT_HTTP_TIMEOUT_SECONDS", "20")
    try:
        return max(float(timeout_raw), 1.0)
    except (TypeError, ValueError):
        return 20.0


def _validate_wechat_api_response(data: dict):
    errcode = data.get("errcode")
    if errcode in (None, 0):
        return
    errmsg = data.get("errmsg", "unknown error")
    raise ValueError(f"WeChat API error {errcode}: {errmsg}")


def _extract_filename_from_content_disposition(
    content_disposition: str | None,
) -> str | None:
    if not content_disposition:
        return None

    for segment in content_disposition.split(";"):
        key, _, value = segment.strip().partition("=")
        if key.lower() == "filename" and value:
            return value.strip().strip('"')
        if key.lower() == "filename*" and value:
            _, _, encoded = value.partition("''")
            return encoded.strip().strip('"') or None
    return None


def _decode_wechat_aes_key(encoding_aes_key: str) -> bytes:
    return base64.b64decode(f"{encoding_aes_key}=")


def build_wechat_signature(*parts: str) -> str:
    raw = "".join(sorted(parts))
    return sha1(raw.encode("utf-8")).hexdigest()


def verify_wechat_signature(*parts: str, signature: str) -> bool:
    return compare_digest(build_wechat_signature(*parts), signature)


def decrypt_wechat_official_message(
    *,
    encrypted_message: str,
    crypto_config: WeChatCryptoConfig,
) -> str:
    aes_key = _decode_wechat_aes_key(crypto_config.encoding_aes_key)
    cipher = Cipher(
        algorithms.AES(aes_key),
        modes.CBC(aes_key[:16]),
    )
    decryptor = cipher.decryptor()
    padded_plaintext = decryptor.update(base64.b64decode(encrypted_message)) + decryptor.finalize()
    unpadder = padding.PKCS7(WECHAT_AES_BLOCK_SIZE).unpadder()
    plaintext = unpadder.update(padded_plaintext) + unpadder.finalize()

    message_length = unpack("!I", plaintext[16:20])[0]
    message = plaintext[20:20 + message_length]
    app_id = plaintext[20 + message_length:].decode("utf-8")
    if app_id != crypto_config.app_id:
        raise ValueError("The WeChat message app id does not match the configured app id")
    return message.decode("utf-8")


def encrypt_wechat_official_message(
    *,
    plaintext: str,
    crypto_config: WeChatCryptoConfig,
) -> str:
    aes_key = _decode_wechat_aes_key(crypto_config.encoding_aes_key)
    random_prefix = secrets.token_bytes(16)
    plaintext_bytes = plaintext.encode("utf-8")
    packed = (
        random_prefix
        + pack("!I", len(plaintext_bytes))
        + plaintext_bytes
        + crypto_config.app_id.encode("utf-8")
    )

    padder = padding.PKCS7(WECHAT_AES_BLOCK_SIZE).padder()
    padded = padder.update(packed) + padder.finalize()
    cipher = Cipher(
        algorithms.AES(aes_key),
        modes.CBC(aes_key[:16]),
    )
    encryptor = cipher.encryptor()
    ciphertext = encryptor.update(padded) + encryptor.finalize()
    return base64.b64encode(ciphertext).decode("utf-8")

def get_mini_wechat_tokens(
    app_id: str,
    app_secret: str,
    code: str
):
    response_token = httpx.post(f'https://api.weixin.qq.com/sns/jscode2session?appid={app_id}&secret={app_secret}&js_code={code}&grant_type=authorization_code')
    try:
        res = MiniWeChatTokenResponse(**response_token.json())
    except Exception:
        exception_logger.error(f'get_mini_wechat_tokens error: {response_token.json()}')
        raise
    return res

def get_web_wechat_tokens(
    app_id: str,
    app_secret: str,
    code: str
):
    response_token = httpx.post(f'https://api.weixin.qq.com/sns/oauth2/access_token?appid={app_id}&secret={app_secret}&code={code}&grant_type=authorization_code')
    try:
        res = WebWeChatTokenResponse(**response_token.json())
    except Exception:
        exception_logger.error(f'get_web_wechat_tokens error: {response_token.json()}')
        raise
    return res

def get_web_user_info(
    access_token: str,
    openid: str
):
    response_user_info = httpx.post(f'https://api.weixin.qq.com/sns/userinfo?access_token={access_token}&openid={openid}&lang=zh_CN')
    return response_user_info.json()


def get_official_wechat_access_token(
    app_id: str,
    app_secret: str,
    force_refresh: bool = False,
) -> str:
    cache_key = f"{app_id}:{app_secret}"
    now = time.time()
    with _official_access_token_lock:
        cached = _official_access_token_cache.get(cache_key)
        if (
            not force_refresh
            and cached is not None
            and cached[1] > now + 60
        ):
            return cached[0]

    response = httpx.get(
        "https://api.weixin.qq.com/cgi-bin/token",
        params={
            "grant_type": "client_credential",
            "appid": app_id,
            "secret": app_secret,
        },
        timeout=_get_timeout(),
    )
    response.raise_for_status()
    data = response.json()
    _validate_wechat_api_response(data)
    result = OfficialWeChatAccessTokenResponse(**data)
    expires_at = now + max(result.expires_in - 120, 60)
    with _official_access_token_lock:
        _official_access_token_cache[cache_key] = (result.access_token, expires_at)
    return result.access_token


def get_official_wechat_user_info(
    access_token: str,
    openid: str,
) -> OfficialWeChatUserInfoResponse:
    response = httpx.get(
        "https://api.weixin.qq.com/cgi-bin/user/info",
        params={
            "access_token": access_token,
            "openid": openid,
            "lang": "zh_CN",
        },
        timeout=_get_timeout(),
    )
    response.raise_for_status()
    data = response.json()
    _validate_wechat_api_response(data)
    return OfficialWeChatUserInfoResponse(**data)


def download_official_wechat_media(
    access_token: str,
    media_id: str,
) -> WeChatMediaDownload:
    response = httpx.get(
        "https://api.weixin.qq.com/cgi-bin/media/get",
        params={
            "access_token": access_token,
            "media_id": media_id,
        },
        timeout=max(_get_timeout(), 30.0),
        follow_redirects=True,
    )
    response.raise_for_status()

    content_type = response.headers.get("Content-Type")
    if (
        (content_type and "application/json" in content_type)
        or response.content[:1] == b"{"
    ):
        try:
            data = response.json()
        except ValueError:
            data = None
        if data is not None:
            _validate_wechat_api_response(data)
            raise ValueError("Unexpected JSON response while downloading WeChat media")

    return WeChatMediaDownload(
        content=response.content,
        content_type=content_type,
        file_name=_extract_filename_from_content_disposition(
            response.headers.get("Content-Disposition")
        ),
    )
