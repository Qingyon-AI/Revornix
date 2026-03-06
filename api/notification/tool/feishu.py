import asyncio
import base64
import hashlib
import hmac
import io
import json
import time
from typing import Any
from urllib.parse import urljoin

import httpx
import lark_oapi as lark
from lark_oapi.api.im.v1 import CreateImageRequest, CreateImageRequestBody, CreateImageResponse

from common.logger import exception_logger
from config.base import base_url
from protocol.notification_tool import NotificationToolProtocol


class FeishuNotificationTool(NotificationToolProtocol):
    
    def __init__(self):
        super().__init__(
            uuid="ecbf8d6f190a4ace9ec5672cdf646425",
            tool_name="Feishu Notification Tool",
            tool_name_zh="飞书通知工具",
            channel_key="feishu",
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
            raw_base_url = base_url
            if raw_base_url is not None:
                normalized_base_url = raw_base_url.strip().strip("'\"")
                if normalized_base_url:
                    if not normalized_base_url.endswith("/"):
                        normalized_base_url += "/"
                    return urljoin(normalized_base_url, normalized_link.lstrip("/"))

        return normalized_link

    def upload_image(
        self,
        image: bytes
    ):
        source_config = self.get_source_config()
        if source_config is None:
            raise ValueError("The source config of the notification is not set")
        app_id = source_config.get("app_id")
        app_secret = source_config.get("app_secret")
        if app_id is None or app_secret is None:
            raise ValueError("The app_id or app_secret of the notification is not set")

        # 创建client
        client = lark.Client.builder() \
            .app_id(app_id=app_id) \
            .app_secret(app_secret=app_secret) \
            .log_level(lark.LogLevel.DEBUG) \
            .build()

        # 构造请求对象
        request: CreateImageRequest = CreateImageRequest.builder() \
            .request_body(CreateImageRequestBody.builder()
                .image_type("message")
                .image(io.BytesIO(image))
                .build()) \
            .build()

        # 发起请求
        im_service = client.im
        if im_service is None:
            raise ValueError("im_service is None")
        response: CreateImageResponse = im_service.v1.image.create(request)

        # 处理失败返回
        if not response.success():
            if response.raw is None:
                lark.logger.error("response is None")
            else:
                if response.raw.content is None:
                    lark.logger.error("response.raw.content is None")
                else:
                    lark.logger.error(
                        f"client.im.v1.image.create failed, code: {response.code}, msg: {response.msg}, log_id: {response.get_log_id()}, resp: \n{json.dumps(json.loads(response.raw.content), indent=4, ensure_ascii=False)}")
            return None

        # 处理业务结果
        lark.logger.info(lark.JSON.marshal(response.data, indent=4))

        if response.data is None:
            raise ValueError("response.data is None")

        return response.data.image_key

    def gen_sign(
        self,
        timestamp: int,
        secret
    ):
        # 拼接timestamp和secret
        string_to_sign = f'{timestamp}\n{secret}'
        hmac_code = hmac.new(string_to_sign.encode("utf-8"), digestmod=hashlib.sha256).digest()
        # 对结果进行base64处理
        return base64.b64encode(hmac_code).decode('utf-8')

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

        webhook_url = target_config.get('webhook_url')
        sign_secret = target_config.get('sign')
        if not webhook_url:
            raise Exception("The webhook_url of the notification is not set")
        
        timestamp = int(time.time())

        generated_sign = self.gen_sign(timestamp, sign_secret) if sign_secret else None
        markdown_content = (content if content is not None else plain_content) or " "
        normalized_title = title
        normalized_link = self._resolve_notification_link(link)

        elements: list[dict[str, Any]] = [
            {
                "tag": "markdown",
                "content": markdown_content,
                "text_align": "left",
                "text_size": "normal_v2",
                "margin": "0px 0px 0px 0px"
            }
        ]

        if cover:
            async with httpx.AsyncClient(timeout=10, follow_redirects=True) as client:
                cover_res = await client.get(cover)
                cover_res.raise_for_status()
            image_key = await asyncio.to_thread(self.upload_image, image=cover_res.content)
            if image_key is not None:
                elements.insert(0, {
                    "tag": "img",
                    "img_key": image_key,
                    "preview": True,
                    "transparent": False,
                    "scale_type": "fit_horizontal",
                    "margin": "0px 0px 0px 0px"
                })
        # 如果有 link，则加入按钮
        if normalized_link:
            elements.append({
                "tag": "button",
                "text": {
                    "tag": "plain_text",
                    "content": "点击查看详情"
                },
                "type": "default",
                "width": "default",
                "size": "medium",
                "behaviors": [
                    {
                        "type": "open_url",
                        "default_url": normalized_link,
                        "pc_url": "",
                        "ios_url": "",
                        "android_url": ""
                    }
                ],
                "margin": "0px 0px 0px 0px"
            })

        payload = {
            "msg_type": "interactive",
            "card": {
                "schema": "2.0",
                "config": {
                    "update_multi": True,
                    "style": {
                        "text_size": {
                            "normal_v2": {
                                "default": "normal",
                                "pc": "normal",
                                "mobile": "heading"
                            }
                        }
                    }
                },
                "body": {
                    "direction": "vertical",
                    "padding": "12px 12px 12px 12px",
                    "elements": elements  # ← 使用动态 elements
                },
                "header": {
                    "title": {
                        "tag": "plain_text",
                        "content": normalized_title
                    },
                    "subtitle": {
                        "tag": "plain_text",
                        "content": ""
                    },
                    "template": "blue",
                    "padding": "12px 12px 12px 12px"
                }
            }
        }

        if generated_sign is not None:
            payload.update({
                'timestamp': timestamp,
                'sign': generated_sign
            })
        try:
            headers = {"Content-Type": "application/json"}
            async with httpx.AsyncClient(timeout=10) as client:
                res = await client.post(webhook_url, json=payload, headers=headers)
            if res.json().get('code') != 0:
                exception_logger.error(f'Failed to send notification to Feishu: {res.json()}')

        except Exception as e:
            exception_logger.error(f"Failed to send notification to Feishu: {e}")
