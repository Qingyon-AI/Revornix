import os

# 两个服务各有自己的 DSN 与开关：api 与 worker 的错误应当分开看，混在一起的话
# 一次 worker 的批量失败会把接口侧的信号淹掉。
#
# 这个文件是 api/worker 合并到 app/ 时的**并集** —— 此前两侧各存一份
# 同名文件，各自只有自己那两个变量，于是"两侧同路径但内容不同"，镜像检查管不着，
# 谁也不知道另一侧长什么样。
API_SENTRY_ENABLE = os.environ.get("API_SENTRY_ENABLE")
API_SENTRY_DSN = os.environ.get("API_SENTRY_DSN")

WORKER_SENTRY_ENABLE = os.environ.get("WORKER_SENTRY_ENABLE")
WORKER_SENTRY_DSN = os.environ.get("WORKER_SENTRY_DSN")
