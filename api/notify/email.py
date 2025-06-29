import smtplib
import schemas
from protocol.notify import NotifyProtocol
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.header import Header
from email.utils import formataddr
from common.logger import exception_logger

class EmailNotify(NotifyProtocol):
    def __init__(self, 
                 source: schemas.notification.NotificationSourceDetail, 
                 target: schemas.notification.NotificationTargetDetail):
        super().__init__(source=source, target=target)
        
    def send_notification(self, message: schemas.notification.Message) -> bool:
        smtp_server = self.source.email_notification_source.server
        smtp_port = self.source.email_notification_source.port
        username = self.source.email_notification_source.email
        password = self.source.email_notification_source.password
        recipient = self.target.email_notification_target.email

        # 构建 MIME 邮件
        msg = MIMEMultipart()
        msg["From"] = formataddr(("Revornix", username))  # 正确设置发件人
        msg["To"] = recipient
        msg["Subject"] = Header(message.title, 'utf-8')
        msg.attach(MIMEText(message.content, "html", "utf-8"))

        try:
            with smtplib.SMTP_SSL(host=smtp_server, port=smtp_port, timeout=10) as server:
                server.login(user=username, password=password)
                server.sendmail(from_addr=username, to_addrs=[recipient], msg=msg.as_string())
            return True

        except smtplib.SMTPException as e:
            exception_logger.error(f"[EmailNotify] 邮件发送失败: {e}")
            return False

        except Exception as e:
            exception_logger.error(f"[EmailNotify] 未知错误: {e}")
            return False