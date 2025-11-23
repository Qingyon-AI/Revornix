import hashlib
import base64
import hmac
import httpx
import time
import urllib.parse
from typing import Optional
from protocol.notification_tool import NotificationToolProtocol
from common.logger import exception_logger
import textwrap


class DingTalkNotificationTool(NotificationToolProtocol):

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
        sign = urllib.parse.quote_plus(base64.b64encode(hmac_code).decode("utf-8"))
        return sign

    async def send_notification(
        self,
        title: str,
        content: Optional[str] = None,
        cover: Optional[str] = None,
        link: Optional[str] = None,
    ):
        if self.source is None or self.target is None:
            raise ValueError("The source or target of the notification is not set")

        target_config = self.get_target_config()
        if target_config is None:
            raise ValueError("The target config of the notification is not set")

        webhook_url = target_config.get("webhook_url")

        # 必须使用毫秒级时间戳
        timestamp = str(int(time.time() * 1000))

        if target_config.get("sign"):
            sign = self.gen_sign(timestamp, target_config.get("sign"))
            webhook_url = f"{webhook_url}&timestamp={timestamp}&sign={sign}"

        # 使用 dedent 去掉 Markdown 缩进
        text = textwrap.dedent(f"""
            # {title}\n
            ## {content}\n
        """)

        if cover:
            text += f"![cover]({cover})\n"

        if link:
            text += f"[点击查看详情]({link})\n"

        payload = {
            "msgtype": "markdown",
            "markdown": {
                "title": title,
                "text": text,
            },
        }

        try:
            headers = {"Content-Type": "application/json"}
            res = httpx.post(webhook_url, json=payload, headers=headers)

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