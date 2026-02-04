import asyncio
import smtplib
import ssl
from email.header import Header
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.utils import formataddr
from pathlib import Path

from jinja2 import Environment, FileSystemLoader, select_autoescape

from common.logger import exception_logger
from protocol.notification_tool import NotificationToolProtocol


class EmailNotificationTool(NotificationToolProtocol):
    """
    邮件通知工具 — 支持 Jinja2 模板渲染、封面图片内嵌。
    """

    # 模板目录（相对项目根或配置路径）
    TEMPLATE_PATH = Path(__file__).parent / "email_templates"

    def __init__(self):
        super().__init__(
            notification_tool_uuid="bf02b01a69f84778a49afaa93c092218",
            notification_tool_name="Email Notification Tool",
            notification_tool_name_zh="邮件通知工具",
        )
        # 初始化 Jinja2 环境
        self._env = Environment(
            loader=FileSystemLoader(str(self.TEMPLATE_PATH)),
            autoescape=select_autoescape(['html', 'xml'])
        )

    async def send_notification(
        self,
        title: str,
        content: str | None = None,
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

        # 构建邮件
        msg = MIMEMultipart('related')
        msg["From"] = formataddr((sender_name, username))
        msg["To"] = recipient
        msg["Subject"] = str(Header(title, 'utf-8'))

        # 渲染模板或基于 content/link 构建内容
        html_body = ""
        try:
            template = self._env.get_template('notification.html')
            params = {
                "title": title,
                "content": content,
                "link": link,
                "cover": cover
            }
            html_body = template.render(**params)
        except Exception as e:
            exception_logger.error(f"[EmailNotify] Template render error: {e}", exc_info=True)
            html_body = content or ""

        # 纯文本版本（减少客户端不支持 html 的风险）
        plain_body = content or ""
        if link:
            plain_body += f"\n查看：{link}"

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
