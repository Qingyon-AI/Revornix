import json
import os
import time
import uuid

import httpx
import jwt
import re, textwrap
from jwcrypto import jwk
from urllib.parse import parse_qs, urljoin, urlparse

from common.logger import exception_logger
from config.base import WEB_BASE_URL
from protocol.notification_tool import NotificationToolProtocol

APPLE_PUBLIC_KEYS_URL = "https://appleid.apple.com/auth/keys"


def _normalize_base_url(raw: str | None) -> str | None:
    if raw is None:
        return None
    normalized = raw.strip().strip("'\"")
    if not normalized:
        return None
    if not normalized.endswith("/"):
        normalized += "/"
    return normalized


def _resolve_notification_link(link: str | None) -> str | None:
    if link is None:
        return None

    normalized_link = link.strip()
    if not normalized_link:
        return None

    if normalized_link.startswith(("http://", "https://")):
        return normalized_link

    if normalized_link.startswith("/"):
        normalized_base_url = _normalize_base_url(WEB_BASE_URL)
        if normalized_base_url:
            return urljoin(normalized_base_url, normalized_link.lstrip("/"))

    return normalized_link


def _build_notification_route(link: str | None) -> dict[str, object] | None:
    normalized_link = _resolve_notification_link(link)
    if normalized_link is None:
        return None

    parsed = urlparse(normalized_link)
    ios_path = parsed.path or normalized_link
    ios_query_values = parse_qs(parsed.query, keep_blank_values=True)
    ios_query: dict[str, str | list[str]] = {}
    for key, values in ios_query_values.items():
        if len(values) == 1:
            ios_query[key] = values[0]
        else:
            ios_query[key] = values

    ios_deep_link_scheme = os.environ.get("IOS_DEEPLINK_SCHEME", "revornix").strip()
    if ios_deep_link_scheme.endswith("://"):
        # Remove trailing "://" if present
        ios_deep_link_scheme = ios_deep_link_scheme[:-3]
    if not ios_deep_link_scheme:
        ios_deep_link_scheme = "revornix"
    deep_link_path = ios_path.lstrip("/")
    ios_url = (
        f"{ios_deep_link_scheme}://{deep_link_path}"
        if deep_link_path
        else f"{ios_deep_link_scheme}://"
    )
    if parsed.query:
        ios_url = f"{ios_url}?{parsed.query}"

    return {
        "web_url": normalized_link,
        "ios_path": ios_path,
        "ios_query": ios_query,
        "ios_url": ios_url,
    }


def _truncate_utf8_bytes(text: str, max_bytes: int) -> str:
    encoded = text.encode("utf-8")
    if len(encoded) <= max_bytes:
        return text

    truncated = encoded[:max_bytes]
    while True:
        try:
            decoded = truncated.decode("utf-8")
            break
        except UnicodeDecodeError as decode_error:
            truncated = truncated[:decode_error.start]

    return decoded.rstrip() + "..."

class AppleNotificationTool(NotificationToolProtocol):
    
    def __init__(self):
        super().__init__(
            uuid="341d8be7bebd4630b1fae93c32c4a21c",
            tool_name="Apple Notification Tool",
            tool_name_zh="Apple通知工具",
            channel_key="apple",
        )
    
    def _normalize_pem(self, pem_str: str) -> bytes:
        pem_str = pem_str.strip()
        m = re.search(r"-----BEGIN ([A-Z ]+)-----\s*(.*?)\s*-----END \1-----", pem_str, flags=re.DOTALL)
        if not m:
            raise ValueError("Not a valid PEM block")
        label = m.group(1)
        body = re.sub(r"\s+", "", m.group(2))
        wrapped = "\n".join(textwrap.wrap(body, 64))
        return f"-----BEGIN {label}-----\n{wrapped}\n-----END {label}-----\n".encode()

    def _create_apns_headers(
        self,
        team_id: str,
        key_id: str,
        private_key: str | bytes,
        apns_topic: str
    ):
        """
        动态生成 APNs 请求所需的 HTTP Headers，包括最新的 JWT Token。
        """
        token = jwt.encode(
            payload={
                "iss": team_id,
                "iat": int(time.time()),
                "exp": int(time.time()) + 3600  # 设置过期时间为1小时以内
            },
            algorithm="ES256",
            headers={
                "alg": "ES256",
                "kid": key_id
            },
            key=private_key
        )
        return {
            "authorization": "bearer " + token,
            "apns-topic": apns_topic,
            "apns-id": str(uuid.uuid4())
        }

    def _fetch_apple_public_keys(
        self
    ):
        """
        从 Apple 的公开 URL 获取公钥。
        """
        try:
            response = httpx.get(APPLE_PUBLIC_KEYS_URL, timeout=5)
            response.raise_for_status()
            return response.json()["keys"]
        except httpx.HTTPError as e:
            exception_logger.error(f"HTTP error occurred: {e}")
            raise Exception(f"Failed to fetch Apple public keys: {e}") from e

    def _get_public_key(
        self,
        kid,
        keys
    ):
        """
        根据 kid 从 Apple 公钥列表中找到对应的公钥。
        """
        public_key_data = next((key for key in keys if key["kid"] == kid), None)
        if not public_key_data or "n" not in public_key_data or "e" not in public_key_data:
            raise Exception("Public key not found or invalid")
        return public_key_data

    def _convert_jwk_to_pem(
        self,
        jwk_data
    ):
        """
        将 JWK 格式的密钥转换为 PEM 格式。
        """
        try:
            key = jwk.JWK.from_json(json.dumps(jwk_data))
            return key.export_to_pem().decode('utf-8')
        except Exception as e:
            exception_logger.error(f"Failed to convert JWK to PEM: {e}")
            raise Exception(f"Failed to convert JWK to PEM: {e}") from e

    def _verify_jwt(
        self,
        identity_token,
        public_key,
        audience: str | None = None
    ):
        """
        验证 JWT 签名并解码。
        """
        return jwt.decode(
            identity_token,
            public_key,
            algorithms=["RS256"],
            audience=audience,  # 替换为你的客户端ID
            issuer="https://appleid.apple.com"
        )

    def _decode_identity_token(
        self,
        identity_token: str
    ):
        """
        主逻辑：获取 Apple 公钥、解析 JWT 头部、验证 JWT。
        """
        # Step 1: 获取 Apple 公钥
        keys = self._fetch_apple_public_keys()

        # Step 2: 解码 JWT 头部以获取 kid
        try:
            header = jwt.get_unverified_header(identity_token)
            kid = header["kid"]
        except Exception as e:
            exception_logger.error(f"Failed to decode JWT header: {e}")
            raise Exception(f"Invalid ID token header: {e}") from e

        # Step 3: 根据 kid 获取对应的公钥
        public_key_data = self._get_public_key(kid, keys)

        # Step 4: 将 JWK 转换为 PEM 格式
        pem_key = self._convert_jwk_to_pem(public_key_data)

        # Step 5: 验证 JWT
        return self._verify_jwt(
            identity_token=identity_token,
            public_key=pem_key
        )

    async def send_notification(
        self,
        title: str,
        content: str | None = None,
        content_type: str | None = None,
        plain_content: str | None = None,
        cover: str | None = None,
        link: str | None = None
    ):
        source_config = self.get_source_config()
        target_config = self.get_target_config()
        if source_config is None or target_config is None:
            raise Exception("The source or target config of the notification is not set")

        team_id = source_config.get('team_id')
        key_id = source_config.get('key_id')
        private_key = source_config.get('private_key')
        apns_topic = source_config.get('apns_topic')
        if not team_id or not key_id or not private_key or not apns_topic:
            raise Exception("The source config of the notification is not complete")
        
        device_token = target_config.get('device_token')
        if device_token is None:
            raise Exception("The target config of the notification is not complete")

        plain_title_source = (title or "").strip()
        plain_content_source = (content if content is not None else plain_content) or ""
        plain_title = _truncate_utf8_bytes(plain_title_source, max_bytes=178)
        plain_content = _truncate_utf8_bytes(plain_content_source, max_bytes=1500)
        route_payload = _build_notification_route(link)

        headers = self._create_apns_headers(
            team_id=team_id,
            key_id=key_id,
            private_key=private_key,
            apns_topic=apns_topic
        )
        device_token = target_config.get('device_token')
        url = f'https://api.push.apple.com/3/device/{device_token}'
        data = {
            "aps" : {
                "alert" : {
                    "title" : plain_title,
                    "body" : plain_content
                },
                "sound": {
                    "name": "default"
                },
                "mutable-content": 1,
            },
            "content-available": 1
        }
        if route_payload is not None:
            data.update({
                "link": route_payload.get("web_url"),
                "route": route_payload,
            })
        if cover is not None:
            data.update({'sender_avatar': cover})
        async with httpx.AsyncClient(http2=True, timeout=10) as client:
            try:
                res = await client.post(url=url, headers=headers, json=data)
                res.raise_for_status()
                return True
            except Exception as e:
                exception_logger.error("Error sending notification to APNs:", e)
                return False
