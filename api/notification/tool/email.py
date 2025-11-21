import smtplib
from protocol.notification_tool import NotificationToolProtocol
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.header import Header
from email.utils import formataddr
from common.logger import exception_logger

class EmailNotificationTool(NotificationToolProtocol):

    def send_notification(
        self, 
        title: str,
        content: str | None = None,
        cover: str | None = None,
    ):
        if self.source is None or self.target is None:
            raise Exception("The source or target of the notification is not set")
        source_config = self.get_source_config()
        target_config = self.get_target_config()
        if source_config is None or target_config is None:
            raise Exception("The source or target config of the notification is not set")
        smtp_server = source_config.get('host')
        smtp_port = source_config.get('port')
        username = source_config.get('username')
        password = source_config.get('password')
        recipient = target_config.get('email')

        # 构建 MIME 邮件
        msg = MIMEMultipart()
        msg["From"] = formataddr(("Revornix", username))  # 正确设置发件人
        msg["To"] = recipient
        msg["Subject"] = str(Header(title, 'utf-8'))
        if content is not None:
            msg.attach(MIMEText(content, "html", "utf-8"))

        try:
            with smtplib.SMTP_SSL(host=smtp_server, port=smtp_port, timeout=10) as server:
                server.login(user=username, password=password)
                server.sendmail(from_addr=username, to_addrs=[recipient], msg=msg.as_string())
            return True

        except smtplib.SMTPException as e:
            exception_logger.error(f"[EmailNotify] SMTP error: {e}")
            return False

        except Exception as e:
            exception_logger.error(f"[EmailNotify] Unknown error: {e}")
            return False