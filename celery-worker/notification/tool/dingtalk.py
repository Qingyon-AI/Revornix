import base64
import hashlib
import hmac
import textwrap
import time
import urllib.parse
from urllib.parse import urljoin

import httpx

from common.logger import exception_logger
from config.base import WEB_BASE_URL
from protocol.notification_tool import NotificationToolProtocol


class DingTalkNotificationTool(NotificationToolProtocol):
    
    def __init__(self):
        super().__init__(
            uuid="44e649be4483436ea6f9826551017945",
            tool_name="DingTalk Notification Tool",
            tool_name_zh="钉钉通知工具",
            channel_key="dingtalk",
        )

    def _resolve_notification_link(self, link: str | None) -> str | None:
        if link is None:
            return None

        normalized_link = link.strip()
        if not normalized_link:
            return None

        if normalized_link.startswith(("http://", "https://")):
            return normalized_link

        if normalized_link.startswith("/"):
            raw_base_url = WEB_BASE_URL
            if raw_base_url is not None:
                normalized_base_url = raw_base_url.strip().strip("'\"")
                if normalized_base_url:
                    if not normalized_base_url.endswith("/"):
                        normalized_base_url += "/"
                    return urljoin(normalized_base_url, normalized_link.lstrip("/"))

        return normalized_link

    def gen_sign(self, timestamp: str, secret: str) -> str:
        """
        钉钉官方签名算法（毫秒时间戳）
        """
        string_to_sign = f"{timestamp}\n{secret}"
        hmac_code = hmac.new(
            secret.encode("utf-8"),
            string_to_sign.encode("utf-8"),
            digestmod=hashlib.sha256,
        ).digest()

        # Base64 -> decode -> urlencode（官方标准流程）
        return urllib.parse.quote_plus(base64.b64encode(hmac_code).decode("utf-8"))

    async def send_notification(
        self,
        title: str,
        content: str | None = None,
        content_type: str | None = None,
        plain_content: str | None = None,
        cover: str | None = None,
        link: str | None = None,
    ):
        target_config = self.get_target_config()
        if target_config is None:
            raise ValueError("The target config of the notification is not set")

        webhook_url = target_config.get("webhook_url")
        sign_secret = target_config.get("sign")
        
        if not webhook_url:
            raise ValueError("The target webhook_url of the notification is not set")

        # 必须使用毫秒级时间戳
        timestamp = str(int(time.time() * 1000))

        if sign_secret:
            sign = self.gen_sign(timestamp, sign_secret)
            webhook_url = f"{webhook_url}&timestamp={timestamp}&sign={sign}"

        normalized_title = title
        normalized_content = content if content is not None else plain_content
        normalized_link = self._resolve_notification_link(link)

        lines = []
        if normalized_content:
            lines.append(normalized_content)

        if cover:
            lines.append(f"![cover]({cover})")

        if normalized_link:
            lines.append(f"[点击查看详情]({normalized_link})")

        text = textwrap.dedent("\n\n".join(lines)).strip() if lines else normalized_title

        payload = {
            "msgtype": "markdown",
            "markdown": {
                "title": normalized_title,
                "text": text,
            },
        }

        try:
            headers = {"Content-Type": "application/json"}
            async with httpx.AsyncClient(timeout=10) as client:
                res = await client.post(webhook_url, json=payload, headers=headers)

            # 先检查 HTTP 状态码
            if res.status_code != 200:
                exception_logger.error(
                    f"Failed to send DingTalk notification, HTTP {res.status_code}, body={res.text}"
                )
                return

            try:
                resp_json = res.json()
            except Exception:
                exception_logger.error(
                    f"Failed to parse DingTalk response JSON: {res.text}"
                )
                return

            if resp_json.get("errcode") != 0:
                exception_logger.error(f"Failed to send notification to DingTalk: {resp_json}")

        except Exception as e:
            exception_logger.error(f"Failed to send notification to DingTalk: {e}")
