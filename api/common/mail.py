import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.header import Header
from config.mail import sender, password

def send_email(to_email, subject, html_content):
    try:
        smtp_server = "smtp.163.com"
        smtp_port = 465

        # 创建MIMEMultipart消息对象
        msg = MIMEMultipart()
        msg["From"] = Header("Revornix", 'utf-8')
        msg["To"] = to_email
        msg["Subject"] =  Header(subject, 'utf-8')

        # 将HTML内容添加到邮件中
        msg.attach(MIMEText(html_content, "html"))

        # 使用SMTP服务器发送邮件
        with smtplib.SMTP_SSL(smtp_server, smtp_port) as server:
            server.login(sender, password)
            server.sendmail(sender, to_email, msg.as_string())

    except smtplib.SMTPException as e:
        raise e