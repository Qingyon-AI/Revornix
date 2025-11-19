import smtplib
import schemas
from protocol.notify import NotifyProtocol
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.header import Header
from email.utils import formataddr
from common.logger import exception_logger

class EmailNotify(NotifyProtocol):
    
    def __init__(
        self
    ):
        super().__init__(
            notify_uuid='e8118c5a5ff4418cafe6f1bc5914f598',
            notify_name='EmailNotify',
            notify_name_zh='电子邮件通知',
            notify_description='Send notification via email',
            notify_description_zh='通过电子邮件发送通知'
        )
        
    def send_notification(
        self, 
        message: schemas.notification.Message
    ):
        if self.source is None or self.target is None:
            raise Exception("The source or target of the notification is not set")
        if self.source.email_notification_source is None or self.target.email_notification_target is None:
            raise Exception("The email notification source or target of the notification is not set")
        smtp_server = self.source.email_notification_source.server
        smtp_port = self.source.email_notification_source.port
        username = self.source.email_notification_source.email
        password = self.source.email_notification_source.password
        recipient = self.target.email_notification_target.email

        # 构建 MIME 邮件
        msg = MIMEMultipart()
        msg["From"] = formataddr(("Revornix", username))  # 正确设置发件人
        msg["To"] = recipient
        msg["Subject"] = str(Header(message.title, 'utf-8'))
        msg.attach(MIMEText(message.content, "html", "utf-8"))

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