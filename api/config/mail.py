import os
# 邮件配置
sender = os.environ.get('sender')
password = os.environ.get('password')
codeTime = os.environ.get('codeTime', 600)