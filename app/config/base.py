import os
from pathlib import Path

WEB_BASE_URL = os.environ.get('WEB_BASE_URL')
GATEWAY_INTERNAL_URL = os.environ.get('GATEWAY_INTERNAL_URL', 'http://localhost:8787')

# 日志目录的基准，`common/logger.py` 是唯一的使用者（写 BASE_DIR/logs/）。
#
# 此前是 `Path(__file__).resolve().parent.parent` —— "config 包的上一级"。在
# config 还各存一份于 api/ 和 worker/ 时，那恰好等于服务根目录；config
# 搬进 app/ 之后这个巧合就不成立了，它会变成 app/，两个服务的日志写到同一处，
# 而那个目录在部署镜像里根本不存在（启动即 FileNotFoundError）。
#
# 改成按**工作目录**取：两个服务都从各自目录启动（start-worker.sh 显式 cd，
# 两个 Dockerfile 都是 WORKDIR /app）。留一个环境变量口子，好让部署方在需要时
# 把日志放到别处，而不必依赖进程的 cwd。
BASE_DIR = Path(os.environ.get("REVORNIX_BASE_DIR") or Path.cwd())

DEPLOY_HOSTS = os.environ.get('DEPLOY_HOSTS', 'localhost').split(',')
OFFICIAL = os.environ.get('OFFICIAL')

UNION_PAY_API_PREFIX = os.environ.get('UNION_PAY_API_PREFIX')

ROOT_USER_NAME = os.environ.get('ROOT_USER_NAME')
ROOT_USER_PASSWORD = os.environ.get('ROOT_USER_PASSWORD')
