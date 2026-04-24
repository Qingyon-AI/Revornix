import asyncio
import mimetypes
import os
import re
import xml.etree.ElementTree as ET

from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse
from uuid import uuid4

import httpx
from fastapi import APIRouter, Query, Request
from fastapi.responses import PlainTextResponse, Response

import crud
import models
import schemas
from common.document_creation import create_document_for_user
from common.logger import exception_logger, format_log_message
from common.timezone import UTC_TIMEZONE_NAME, get_cached_user_timezone
from common.tp_auth.wechat_utils import (
    WeChatMediaDownload,
    WeChatCryptoConfig,
    build_wechat_signature,
    decrypt_wechat_official_message,
    download_official_wechat_media,
    encrypt_wechat_official_message,
    get_official_wechat_access_token,
    get_official_wechat_user_info,
    verify_wechat_signature,
)
from data.sql.base import async_session_context
from enums.document import DocumentCategory
from enums.user import WeChatUserSource
from proxy.file_system_proxy import FileSystemProxy
from router.user_shared import commit_with_bucket_cleanup_async, setup_default_file_system_for_user_async


WECHAT_OFFICIAL_PLATFORM = "wechat-official"
WECHAT_OFFICIAL_DEFAULT_TIMEZONE = "Asia/Shanghai"
WECHAT_OFFICIAL_SUBSCRIBE_WELCOME_MESSAGE = (
    "欢迎关注 Revornix。\n"
    "这里可以作为你的随手收藏入口。\n"
    "实用技巧：\n"
    "1. 直接发送网页链接，我会帮你存成链接文档。\n"
    "2. 发送文本，我会保存为速记。\n"
    "3. 发送语音会自动转写，图片、文件也能直接入库。\n"
    "提醒：\n"
    "1. 官网：https://revornix.com\n"
    "2. 任何类型，每次只能单独处理一条，请不要一条消息发送多个链接。"
)

wechat_official_router = APIRouter()


@dataclass(slots=True)
class WeChatOfficialIncomingMessage:
    to_user_name: str
    from_user_name: str
    msg_type: str
    create_time: int | None = None
    msg_id: str | None = None
    content: str | None = None
    url: str | None = None
    title: str | None = None
    description: str | None = None
    pic_url: str | None = None
    media_id: str | None = None
    thumb_media_id: str | None = None
    format: str | None = None
    recognition: str | None = None
    event: str | None = None


def _get_wechat_official_settings() -> tuple[str | None, str | None, str | None, str | None]:
    return (
        os.environ.get("WECHAT_OFFICIAL_TOKEN"),
        os.environ.get("WECHAT_OFFICIAL_APP_ID"),
        os.environ.get("WECHAT_OFFICIAL_APP_SECRET"),
        os.environ.get("WECHAT_OFFICIAL_ENCODING_AES_KEY"),
    )


def _build_wechat_crypto_config(
    *,
    token: str | None,
    app_id: str | None,
    encoding_aes_key: str | None,
) -> WeChatCryptoConfig | None:
    if token is None or app_id is None or encoding_aes_key is None:
        return None
    return WeChatCryptoConfig(
        token=token,
        app_id=app_id,
        encoding_aes_key=encoding_aes_key,
    )


def _build_text_reply_xml(
    *,
    incoming_message: WeChatOfficialIncomingMessage,
    content: str,
) -> str:
    return (
        "<xml>"
        f"<ToUserName><![CDATA[{incoming_message.from_user_name}]]></ToUserName>"
        f"<FromUserName><![CDATA[{incoming_message.to_user_name}]]></FromUserName>"
        f"<CreateTime>{int(datetime.now(timezone.utc).timestamp())}</CreateTime>"
        "<MsgType><![CDATA[text]]></MsgType>"
        f"<Content><![CDATA[{content}]]></Content>"
        "</xml>"
    )


def _build_plain_xml_response(xml_text: str) -> Response:
    return Response(content=xml_text, media_type="application/xml")


def _build_secure_xml_response(
    *,
    xml_text: str,
    crypto_config: WeChatCryptoConfig,
    nonce: str | None,
) -> Response:
    encrypted = encrypt_wechat_official_message(
        plaintext=xml_text,
        crypto_config=crypto_config,
    )
    response_nonce = nonce or uuid4().hex
    timestamp = str(int(datetime.now(timezone.utc).timestamp()))
    msg_signature = build_wechat_signature(
        crypto_config.token,
        timestamp,
        response_nonce,
        encrypted,
    )
    response_xml = (
        "<xml>"
        f"<Encrypt><![CDATA[{encrypted}]]></Encrypt>"
        f"<MsgSignature><![CDATA[{msg_signature}]]></MsgSignature>"
        f"<TimeStamp>{timestamp}</TimeStamp>"
        f"<Nonce><![CDATA[{response_nonce}]]></Nonce>"
        "</xml>"
    )
    return Response(content=response_xml, media_type="application/xml")


def _build_text_reply_response(
    *,
    incoming_message: WeChatOfficialIncomingMessage,
    content: str,
    is_encrypted_request: bool,
    crypto_config: WeChatCryptoConfig | None,
    nonce: str | None,
) -> Response:
    reply_xml = _build_text_reply_xml(
        incoming_message=incoming_message,
        content=content,
    )
    if is_encrypted_request and crypto_config is not None:
        return _build_secure_xml_response(
            xml_text=reply_xml,
            crypto_config=crypto_config,
            nonce=nonce,
        )
    return _build_plain_xml_response(reply_xml)


def _truncate_text(value: str | None, limit: int, fallback: str | None = None) -> str | None:
    if value is None:
        return fallback
    normalized = " ".join(value.split())
    if not normalized:
        return fallback
    return normalized[:limit]


def _normalize_nickname(nickname: str | None) -> str:
    normalized = _truncate_text(nickname, 50)
    if normalized:
        return normalized
    return f"Revornix User {uuid4().hex[:8]}"


def _extract_single_http_url(text: str | None) -> str | None:
    if text is None:
        return None
    candidate = text.strip()
    if not re.fullmatch(r"https?://\S+", candidate):
        return None
    parsed = urlparse(candidate)
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        return None
    return candidate


def _parse_wechat_official_message(body: bytes) -> WeChatOfficialIncomingMessage:
    root = ET.fromstring(body.decode("utf-8"))
    payload = {
        child.tag: (child.text or "").strip()
        for child in root
    }
    return WeChatOfficialIncomingMessage(
        to_user_name=payload.get("ToUserName", ""),
        from_user_name=payload.get("FromUserName", ""),
        msg_type=payload.get("MsgType", "").lower(),
        create_time=int(payload["CreateTime"]) if payload.get("CreateTime") else None,
        msg_id=payload.get("MsgId"),
        content=payload.get("Content"),
        url=payload.get("Url"),
        title=payload.get("Title"),
        description=payload.get("Description"),
        pic_url=payload.get("PicUrl"),
        media_id=payload.get("MediaId"),
        thumb_media_id=payload.get("ThumbMediaId"),
        format=payload.get("Format"),
        recognition=payload.get("Recognition"),
        event=payload.get("Event", "").lower() or None,
    )


def _extract_encrypted_message(body: bytes) -> str | None:
    root = ET.fromstring(body.decode("utf-8"))
    encrypt_node = root.find("Encrypt")
    if encrypt_node is None or encrypt_node.text is None:
        return None
    encrypted_message = encrypt_node.text.strip()
    return encrypted_message or None


def _infer_file_extension(
    *,
    file_name: str | None,
    content_type: str | None,
    format_hint: str | None,
) -> str:
    existing_suffix = Path(file_name or "").suffix
    if existing_suffix:
        return existing_suffix

    if format_hint:
        normalized_format = format_hint.lower().lstrip(".")
        if normalized_format:
            return f".{normalized_format}"

    extension_map = {
        "image/jpeg": ".jpg",
        "audio/amr": ".amr",
        "audio/silk": ".sil",
        "audio/x-wav": ".wav",
        "audio/wav": ".wav",
    }
    if content_type in extension_map:
        return extension_map[content_type]

    guessed_extension = mimetypes.guess_extension(content_type or "")
    if guessed_extension:
        return guessed_extension
    return ".bin"


def _build_wechat_media_path(
    *,
    message_type: str,
    file_name: str | None,
    content_type: str | None,
    format_hint: str | None,
) -> str:
    extension = _infer_file_extension(
        file_name=file_name,
        content_type=content_type,
        format_hint=format_hint,
    )
    folder = "audio" if message_type in {"voice", "audio"} else "file"
    date_path = datetime.now(timezone.utc).strftime("%Y/%m/%d")
    return f"wechat/official/{folder}/{date_path}/{uuid4().hex}{extension}"


async def _download_wechat_image_from_pic_url(
    pic_url: str,
) -> WeChatMediaDownload:
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.get(pic_url, follow_redirects=True)
        response.raise_for_status()
        return WeChatMediaDownload(
            content=response.content,
            content_type=response.headers.get("Content-Type"),
            file_name=None,
        )


async def _ensure_user_default_file_system(
    *,
    db,
    user: models.user.User,
) -> None:
    if user.default_user_file_system is not None:
        return
    file_service = await setup_default_file_system_for_user_async(
        db=db,
        db_user=user,
    )
    await commit_with_bucket_cleanup_async(
        db=db,
        file_service=file_service,
    )
    await db.refresh(user)


async def _resolve_wechat_official_user(
    *,
    db,
    openid: str,
    union_id: str,
    nickname: str | None,
) -> models.user.User:
    db_official_user = await crud.user.get_wechat_user_by_wechat_open_id_async(
        db=db,
        wechat_user_open_id=openid,
        filter_wechat_platform=WeChatUserSource.REVORNIX_OFFICIAL_ACCOUNT,
    )
    if db_official_user is not None:
        db_user = await crud.user.get_user_by_id_async(
            db=db,
            user_id=db_official_user.user_id,
        )
        if db_user is None:
            raise Exception("The user bound to the WeChat user record does not exist")
        normalized_nickname = _truncate_text(nickname, 100)
        should_commit = False
        if db_official_user.wechat_user_union_id != union_id:
            db_official_user.wechat_user_union_id = union_id
            should_commit = True
        if normalized_nickname and db_official_user.wechat_user_name != normalized_nickname:
            db_official_user.wechat_user_name = normalized_nickname
            should_commit = True
        if should_commit:
            await db.commit()
        return db_user

    deleted_official_user = await crud.user.get_wechat_user_by_wechat_open_id_async(
        db=db,
        wechat_user_open_id=openid,
        filter_wechat_platform=WeChatUserSource.REVORNIX_OFFICIAL_ACCOUNT,
        include_deleted=True,
    )
    if deleted_official_user is not None and deleted_official_user.delete_at is not None:
        db_user = await crud.user.get_user_by_id_async(
            db=db,
            user_id=deleted_official_user.user_id,
        )
        if db_user is not None:
            deleted_official_user.delete_at = None
            deleted_official_user.wechat_user_union_id = union_id
            normalized_nickname = _truncate_text(nickname, 100)
            if normalized_nickname:
                deleted_official_user.wechat_user_name = normalized_nickname
            await db.commit()
            return db_user

    db_wechat_users = await crud.user.get_wechat_user_by_wechat_union_id_async(
        db=db,
        wechat_user_union_id=union_id,
    )
    db_user = None
    if db_wechat_users:
        db_user = await crud.user.get_user_by_id_async(
            db=db,
            user_id=db_wechat_users[0].user_id,
        )
    if db_user is None:
        normalized_nickname = _normalize_nickname(nickname)
        db_user = await crud.user.create_base_user_async(
            db=db,
            avatar="files/default_avatar.png",
            nickname=normalized_nickname,
        )
        await crud.user.create_wechat_user_async(
            db=db,
            user_id=db_user.id,
            wechat_platform=WeChatUserSource.REVORNIX_OFFICIAL_ACCOUNT,
            wechat_user_open_id=openid,
            wechat_user_union_id=union_id,
            wechat_user_name=_truncate_text(nickname, 100, fallback=normalized_nickname),
        )
        file_service = await setup_default_file_system_for_user_async(
            db=db,
            db_user=db_user,
        )
        await commit_with_bucket_cleanup_async(
            db=db,
            file_service=file_service,
        )
        return db_user

    await crud.user.create_wechat_user_async(
        db=db,
        user_id=db_user.id,
        wechat_platform=WeChatUserSource.REVORNIX_OFFICIAL_ACCOUNT,
        wechat_user_open_id=openid,
        wechat_user_union_id=union_id,
        wechat_user_name=_truncate_text(nickname, 100, fallback=db_user.nickname),
    )
    await db.commit()
    return db_user


async def _save_message_media_for_user(
    *,
    db,
    user: models.user.User,
    message: WeChatOfficialIncomingMessage,
    access_token: str,
) -> tuple[str, str | None]:
    await _ensure_user_default_file_system(
        db=db,
        user=user,
    )

    media_download: WeChatMediaDownload | None = None
    if message.media_id:
        media_download = await download_official_wechat_media(
            access_token=access_token,
            media_id=message.media_id,
        )
    elif message.msg_type == "image" and message.pic_url:
        media_download = await _download_wechat_image_from_pic_url(
            pic_url=message.pic_url,
        )

    if media_download is None:
        raise Exception(f"The WeChat message type {message.msg_type} does not provide downloadable media")

    file_path = _build_wechat_media_path(
        message_type=message.msg_type,
        file_name=media_download.file_name,
        content_type=media_download.content_type,
        format_hint=message.format,
    )
    remote_file_service = await FileSystemProxy.create(
        user_id=user.id,
    )
    await remote_file_service.upload_raw_content_to_path(
        file_path=file_path,
        content=media_download.content,
        content_type=media_download.content_type,
    )
    original_name = Path(media_download.file_name or "").name or None
    return file_path, original_name


async def _build_document_request_from_message(
    *,
    db,
    user: models.user.User,
    message: WeChatOfficialIncomingMessage,
    access_token: str,
) -> schemas.document.DocumentCreateRequest | None:
    if message.msg_type == "text":
        content = (message.content or "").strip()
        if not content:
            return None
        maybe_url = _extract_single_http_url(content)
        if maybe_url is not None:
            return schemas.document.DocumentCreateRequest(
                from_plat=WECHAT_OFFICIAL_PLATFORM,
                category=DocumentCategory.WEBSITE,
                url=maybe_url,
                title=_truncate_text(maybe_url, 200, fallback="WeChat Link"),
                description="Collected from a WeChat official account text message.",
            )
        return schemas.document.DocumentCreateRequest(
            from_plat=WECHAT_OFFICIAL_PLATFORM,
            category=DocumentCategory.QUICK_NOTE,
            content=content,
            title=_truncate_text(content, 200, fallback="WeChat Note"),
            description=_truncate_text(content, 1000, fallback="Collected from a WeChat official account text message."),
        )

    if message.msg_type == "link":
        if not message.url:
            return None
        return schemas.document.DocumentCreateRequest(
            from_plat=WECHAT_OFFICIAL_PLATFORM,
            category=DocumentCategory.WEBSITE,
            url=message.url,
            title=_truncate_text(message.title, 200, fallback="WeChat Link"),
            description=_truncate_text(
                message.description,
                1000,
                fallback="Collected from a WeChat official account link message.",
            ),
        )

    if message.msg_type in {"image", "file", "video", "shortvideo"}:
        file_path, original_name = await _save_message_media_for_user(
            db=db,
            user=user,
            message=message,
            access_token=access_token,
        )
        fallback_title = f"WeChat {message.msg_type.title()}"
        return schemas.document.DocumentCreateRequest(
            from_plat=WECHAT_OFFICIAL_PLATFORM,
            category=DocumentCategory.FILE,
            file_name=file_path,
            title=_truncate_text(original_name, 200, fallback=fallback_title),
            description=f"Collected from a WeChat official account {message.msg_type} message.",
        )

    if message.msg_type in {"voice", "audio"}:
        file_path, original_name = await _save_message_media_for_user(
            db=db,
            user=user,
            message=message,
            access_token=access_token,
        )
        return schemas.document.DocumentCreateRequest(
            from_plat=WECHAT_OFFICIAL_PLATFORM,
            category=DocumentCategory.AUDIO,
            file_name=file_path,
            title=_truncate_text(original_name, 200, fallback="WeChat Audio"),
            description=_truncate_text(
                message.recognition,
                1000,
                fallback="Collected from a WeChat official account audio message.",
            ),
            auto_transcribe=True,
        )

    return None


async def _process_wechat_official_message(
    message: WeChatOfficialIncomingMessage,
    app_id: str,
    app_secret: str,
) -> None:
    try:
        access_token = await get_official_wechat_access_token(
            app_id=app_id,
            app_secret=app_secret,
        )
        wechat_user_info = await get_official_wechat_user_info(
            access_token=access_token,
            openid=message.from_user_name,
        )
        if wechat_user_info.unionid is None:
            raise Exception(
                "WeChat official account unionid is missing. Please ensure the official account is bound to the same Open Platform account."
            )

        async with async_session_context() as db:
            db_user = await _resolve_wechat_official_user(
                db=db,
                openid=message.from_user_name,
                union_id=wechat_user_info.unionid,
                nickname=wechat_user_info.nickname,
            )

            if message.msg_type == "event":
                return

            document_request = await _build_document_request_from_message(
                db=db,
                user=db_user,
                message=message,
                access_token=access_token,
            )
            if document_request is None:
                return

            summary_timezone = await get_cached_user_timezone(db_user.id)
            if summary_timezone == UTC_TIMEZONE_NAME:
                summary_timezone = WECHAT_OFFICIAL_DEFAULT_TIMEZONE

            await create_document_for_user(
                db=db,
                user=db_user,
                document_create_request=document_request,
                summary_timezone=summary_timezone,
            )
    except Exception as exc:
        exception_logger.error(
            format_log_message(
                "wechat_official_message_process_failed",
                msg_type=message.msg_type,
                openid=message.from_user_name,
                msg_id=message.msg_id,
                event=message.event,
                error=exc,
            )
        )


async def _process_wechat_official_unsubscribe(
    openid: str,
) -> None:
    try:
        async with async_session_context() as db:
            await crud.user.delete_wechat_user_by_wechat_open_id_async(
                db=db,
                wechat_user_open_id=openid,
                filter_wechat_platform=WeChatUserSource.REVORNIX_OFFICIAL_ACCOUNT,
            )
            await db.commit()
    except Exception as exc:
        exception_logger.error(
            format_log_message(
                "wechat_official_unsubscribe_process_failed",
                openid=openid,
                error=exc,
            )
        )


@wechat_official_router.get("/official/callback", include_in_schema=False)
async def verify_wechat_official_callback(
    timestamp: str = Query(...),
    nonce: str = Query(...),
    echostr: str = Query(...),
    signature: str | None = Query(default=None),
    msg_signature: str | None = Query(default=None, alias="msg_signature"),
    encrypt_type: str | None = Query(default=None, alias="encrypt_type"),
):
    token, app_id, _, encoding_aes_key = _get_wechat_official_settings()
    if token is None:
        raise schemas.error.CustomException("WeChat official account token is not configured", 500)
    crypto_config = _build_wechat_crypto_config(
        token=token,
        app_id=app_id,
        encoding_aes_key=encoding_aes_key,
    )

    if msg_signature is not None and crypto_config is not None:
        if not verify_wechat_signature(
            token,
            timestamp,
            nonce,
            echostr,
            signature=msg_signature,
        ):
            raise schemas.error.CustomException("Invalid WeChat message signature", 403)
        decrypted_echo = decrypt_wechat_official_message(
            encrypted_message=echostr,
            crypto_config=crypto_config,
        )
        return PlainTextResponse(content=decrypted_echo)

    if signature is None:
        raise schemas.error.CustomException("Missing WeChat signature", 403)
    if not verify_wechat_signature(
        token,
        timestamp,
        nonce,
        signature=signature,
    ):
        raise schemas.error.CustomException("Invalid WeChat signature", 403)

    if encrypt_type == "aes" and crypto_config is not None:
        try:
            decrypted_echo = decrypt_wechat_official_message(
                encrypted_message=echostr,
                crypto_config=crypto_config,
            )
            return PlainTextResponse(content=decrypted_echo)
        except Exception:
            pass
    return PlainTextResponse(content=echostr)


@wechat_official_router.post("/official/callback", include_in_schema=False)
async def receive_wechat_official_message(
    request: Request,
    timestamp: str = Query(...),
    nonce: str = Query(...),
    signature: str | None = Query(default=None),
    msg_signature: str | None = Query(default=None, alias="msg_signature"),
    encrypt_type: str | None = Query(default=None, alias="encrypt_type"),
):
    token, app_id, app_secret, encoding_aes_key = _get_wechat_official_settings()
    if token is None:
        raise schemas.error.CustomException("WeChat official account token is not configured", 500)
    crypto_config = _build_wechat_crypto_config(
        token=token,
        app_id=app_id,
        encoding_aes_key=encoding_aes_key,
    )

    raw_body = await request.body()
    if not raw_body:
        return PlainTextResponse(content="")

    is_encrypted_request = (
        encrypt_type == "aes"
        or msg_signature is not None
        or b"<Encrypt>" in raw_body
    )

    parsed_body = raw_body
    if is_encrypted_request:
        if crypto_config is None:
            raise schemas.error.CustomException("WeChat official account secure mode is not fully configured", 500)
        encrypted_message = _extract_encrypted_message(raw_body)
        if encrypted_message is None:
            raise schemas.error.CustomException("Missing encrypted WeChat payload", 400)
        if msg_signature is None:
            raise schemas.error.CustomException("Missing WeChat message signature", 403)
        if not verify_wechat_signature(
            token,
            timestamp,
            nonce,
            encrypted_message,
            signature=msg_signature,
        ):
            raise schemas.error.CustomException("Invalid WeChat message signature", 403)
        decrypted_body = decrypt_wechat_official_message(
            encrypted_message=encrypted_message,
            crypto_config=crypto_config,
        )
        parsed_body = decrypted_body.encode("utf-8")
    else:
        if signature is None:
            raise schemas.error.CustomException("Missing WeChat signature", 403)
        if not verify_wechat_signature(
            token,
            timestamp,
            nonce,
            signature=signature,
        ):
            raise schemas.error.CustomException("Invalid WeChat signature", 403)

    incoming_message = _parse_wechat_official_message(parsed_body)

    if incoming_message.msg_type == "event":
        if incoming_message.event == "subscribe":
            if app_id and app_secret:
                asyncio.create_task(
                    _process_wechat_official_message(
                        incoming_message,
                        app_id,
                        app_secret,
                    )
                )
            return _build_text_reply_response(
                incoming_message=incoming_message,
                content=WECHAT_OFFICIAL_SUBSCRIBE_WELCOME_MESSAGE,
                is_encrypted_request=is_encrypted_request,
                crypto_config=crypto_config,
                nonce=nonce,
            )
        if incoming_message.event == "unsubscribe":
            asyncio.create_task(
                _process_wechat_official_unsubscribe(
                    incoming_message.from_user_name,
                )
            )
            return PlainTextResponse(content="")
        return _build_text_reply_response(
            incoming_message=incoming_message,
            content="已收到事件。",
            is_encrypted_request=is_encrypted_request,
            crypto_config=crypto_config,
            nonce=nonce,
        )

    supported_message_types = {"text", "link", "image", "file", "video", "shortvideo", "voice", "audio"}
    if incoming_message.msg_type not in supported_message_types:
        return _build_text_reply_response(
            incoming_message=incoming_message,
            content="暂不支持该消息类型，目前支持文本、图片、音频、文件和链接消息。",
            is_encrypted_request=is_encrypted_request,
            crypto_config=crypto_config,
            nonce=nonce,
        )

    if app_id is None or app_secret is None:
        return _build_text_reply_response(
            incoming_message=incoming_message,
            content="服务暂未配置完成，请稍后再试。",
            is_encrypted_request=is_encrypted_request,
            crypto_config=crypto_config,
            nonce=nonce,
        )

    asyncio.create_task(
        _process_wechat_official_message(
            incoming_message,
            app_id,
            app_secret,
        )
    )
    return _build_text_reply_response(
        incoming_message=incoming_message,
        content="已收到，正在写入 Revornix。",
        is_encrypted_request=is_encrypted_request,
        crypto_config=crypto_config,
        nonce=nonce,
    )
