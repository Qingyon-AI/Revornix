import smtplib
import ssl
from pathlib import Path
from typing import Optional
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.header import Header
from email.utils import formataddr
from jinja2 import Environment, FileSystemLoader, select_autoescape
from protocol.notification_tool import NotificationToolProtocol
from common.logger import exception_logger


class EmailNotificationTool(NotificationToolProtocol):
    """
    邮件通知工具 — 支持 Jinja2 模板渲染、封面图片内嵌。
    """

    # 模板目录（相对项目根或配置路径）
    TEMPLATE_PATH = Path(__file__).parent / "email_templates"

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # 初始化 Jinja2 环境
        self._env = Environment(
            loader=FileSystemLoader(str(self.TEMPLATE_PATH)),
            autoescape=select_autoescape(['html', 'xml'])
        )

    def send_notification(
        self,
        title: str,
        content: Optional[str] = None,
        cover: Optional[str] = None,
        link: Optional[str] = None
    ) -> bool:
        if self.source is None or self.target is None:
            raise ValueError("The source or target of the notification is not set")

        source_config = self.get_source_config()
        target_config = self.get_target_config()
        if source_config is None or target_config is None:
            raise ValueError("The source or target config of the notification is not set")

        smtp_host = source_config.get('host')
        smtp_port = source_config.get('port')
        username = source_config.get('username')
        password = source_config.get('password')
        sender_name = source_config.get('sender_name', username)
        recipient = target_config.get('email')

        if not smtp_host or not smtp_port or not username or not password:
            exception_logger.error(
                f"[EmailNotify] SMTP config missing: host={smtp_host}, port={smtp_port}, username={username}"
            )
            return False
        if not recipient:
            exception_logger.error(f"[EmailNotify] Recipient email not set: target_config={target_config}")
            return False

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
            context = ssl.create_default_context()
            with smtplib.SMTP_SSL(host=smtp_host, port=smtp_port, context=context, timeout=10) as server:
                server.login(user=username, password=password)
                server.sendmail(from_addr=username, to_addrs=[recipient], msg=msg.as_string())
            return True

        except smtplib.SMTPException as smtp_err:
            exception_logger.error(f"[EmailNotify] SMTP error: {smtp_err}", exc_info=True)
            return False
        except Exception as err:
            exception_logger.error(f"[EmailNotify] Unexpected error: {err}", exc_info=True)
            return False