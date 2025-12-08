from dotenv import load_dotenv
load_dotenv(override=True)

import smtplib
import asyncio
import ssl
import os
from pathlib import Path
from typing import Optional
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.header import Header
from email.utils import formataddr
from jinja2 import Environment, FileSystemLoader, select_autoescape
from common.logger import exception_logger

SMTP_HOST = os.environ.get('SMTP_HOST')
SMTP_PORT = os.environ.get('SMTP_PORT')
SMTP_USERNAME = os.environ.get('SMTP_USERNAME')
SMTP_PASSWORD = os.environ.get('SMTP_PASSWORD')
if not SMTP_HOST or not SMTP_PORT or not SMTP_USERNAME or not SMTP_PASSWORD:
    raise Exception("SMTP_HOST or SMTP_PORT or SMTP_USERNAME or SMTP_PASSWORD is not set")

class RevornixSystemEmail:
    TEMPLATE_PATH = Path(__file__).parent / "email_templates"

    def __init__(
        self,
        host: str = SMTP_HOST,
        port: int = int(SMTP_PORT),
        username: str = SMTP_USERNAME,
        password: str = SMTP_PASSWORD,
        sender_name: Optional[str] = "Revornix-No-Reply"
    ):
        self.host = host
        self.port = port
        self.username = username
        self.password = password
        self.sender_name = sender_name
        self.sender = formataddr((self.sender_name, self.username))

        # 初始化 Jinja2
        self.env = Environment(
            loader=FileSystemLoader(str(self.TEMPLATE_PATH)),
            autoescape=select_autoescape(["html", "xml"])
        )

    async def send(
        self,
        recipient: str,
        title: str,
        content: Optional[str] = None,
        cover: Optional[str] = None,
        template: Optional[str] = "default.html"
    ) -> bool:

        try:
            template_obj = self.env.get_template(template or "default.html")
            html_body = template_obj.render(
                title=title,
                content=content,
                cover=cover
            )
        except Exception as e:
            exception_logger.error(f"Template load error: {e}", exc_info=True)
            html_body = content or ""

        msg = MIMEMultipart("alternative")
        msg["From"] = self.sender
        msg["To"] = recipient
        msg["Subject"] = str(Header(title, "utf-8"))

        plain_body = content or ""
        msg.attach(MIMEText(plain_body, "plain", "utf-8"))
        msg.attach(MIMEText(html_body, "html", "utf-8"))

        def send_sync():
            context = ssl.create_default_context()
            with smtplib.SMTP_SSL(host=self.host, port=self.port, context=context, timeout=10) as smtp:
                smtp.login(user=self.username, password=self.password)
                smtp.sendmail(self.sender, [recipient], msg.as_string())

        try:
            await asyncio.to_thread(send_sync)
            return True
        except Exception as e:
            # 记录日志
            exception_logger.error(f"SMTP send error: {e}", exc_info=True)
            raise


if __name__ == "__main__":
    email = RevornixSystemEmail()
    asyncio.run(email.send("1142704468@qq.com", "注册Revornix账号", "你正在注册Revornix账号，验证码是202412，如果不是你在操作，请忽略本邮件。", None, "register.html"))