import asyncio
import html
import smtplib
import ssl
from email.header import Header
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.utils import formataddr
from pathlib import Path
from urllib.parse import urljoin

from jinja2 import Environment, FileSystemLoader, select_autoescape

from common.logger import exception_logger
from config.base import base_url
from protocol.notification_tool import NotificationToolProtocol


class EmailNotificationTool(NotificationToolProtocol):
    """
    邮件通知工具 — 支持 Jinja2 模板渲染、封面图片内嵌。
    """

    # 模板目录（相对项目根或配置路径）
    TEMPLATE_PATH = Path(__file__).parent / "email_templates"

    def __init__(self):
        super().__init__(
            uuid="bf02b01a69f84778a49afaa93c092218",
            tool_name="Email Notification Tool",
            tool_name_zh="邮件通知工具",
            channel_key="email",
        )
        # 初始化 Jinja2 环境
        self._env = Environment(
            loader=FileSystemLoader(str(self.TEMPLATE_PATH)),
            autoescape=select_autoescape(['html', 'xml'])
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
            raise ValueError("The source or target config of the notification is not set")

        smtp_host = source_config.get('host')
        smtp_port = source_config.get('port')
        username = source_config.get('username')
        password = source_config.get('password')
        sender_name = source_config.get('sender_name', username)
        if not smtp_host or not smtp_port or not username or not password or not sender_name:
            raise Exception(f"[EmailNotify] SMTP config is not complete")

        recipient = target_config.get('email')
        if not recipient:
            raise Exception(f"[EmailNotify] Email recipient not set: {recipient}")

        normalized_title = (title or "").strip()
        normalized_link = self._resolve_notification_link(link)
        if content_type == "html":
            content_html = content or ""
            content_plain = plain_content if plain_content is not None else ""
        elif content_type == "plain":
            plain_text_content = (content if content is not None else plain_content) or ""
            content_plain = plain_content if plain_content is not None else plain_text_content
            if plain_text_content:
                escaped = html.escape(plain_text_content)
                escaped = escaped.replace("\n", "<br>")
                content_html = f"<p>{escaped}</p>"
            else:
                content_html = ""
        else:
            plain_text_content = (content if content is not None else plain_content) or ""
            content_plain = plain_content if plain_content is not None else plain_text_content
            if plain_text_content:
                escaped = html.escape(plain_text_content)
                escaped = escaped.replace("\n", "<br>")
                content_html = f"<p>{escaped}</p>"
            else:
                content_html = ""

        # 构建邮件
        msg = MIMEMultipart('related')
        msg["From"] = formataddr((sender_name, username))
        msg["To"] = recipient
        msg["Subject"] = str(Header(normalized_title, 'utf-8'))

        # 渲染模板或基于 content/link 构建内容
        html_body = ""
        try:
            template = self._env.get_template('notification.html')
            params = {
                "title": normalized_title,
                "content_html": content_html,
                "link": normalized_link,
                "cover": cover
            }
            html_body = template.render(**params)
        except Exception as e:
            exception_logger.error(f"[EmailNotify] Template render error: {e}", exc_info=True)
            html_body = content_html

        # 纯文本版本（减少客户端不支持 html 的风险）
        plain_body = content_plain
        if normalized_link:
            plain_body = f"{plain_body}\n\n查看：{normalized_link}".strip()

        # 混合 body： alternative 先 plain，再 html
        alternative = MIMEMultipart('alternative')
        alternative.attach(MIMEText(plain_body, "plain", "utf-8"))
        alternative.attach(MIMEText(html_body, "html", "utf-8"))
        msg.attach(alternative)

        try:
            def _send():
                context = ssl.create_default_context()
                with smtplib.SMTP_SSL(host=smtp_host, port=smtp_port, context=context, timeout=10) as server:
                    server.login(user=username, password=password)
                    server.sendmail(from_addr=username, to_addrs=[recipient], msg=msg.as_string())

            return await asyncio.to_thread(_send)

        except smtplib.SMTPException as smtp_err:
            exception_logger.error(f"[EmailNotify] SMTP error: {smtp_err}", exc_info=True)
            raise
        except Exception as err:
            exception_logger.error(f"[EmailNotify] Unexpected error: {err}", exc_info=True)
            raise
