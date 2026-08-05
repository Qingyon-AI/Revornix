# 构建上下文是**仓库根**，不是 celery-worker/ —— 这个服务依赖同级的 app/。
# 对应的构建命令：docker build -f celery-worker/Dockerfile .
FROM python:3.11-slim AS base

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# 依赖层单独一层：worker 的依赖树很重（torch 等），改业务代码不该触发重装。
COPY app/ /app/
COPY celery-worker/requirements.txt /app/requirements.txt
# 本地 embedding 引擎的依赖（torch，wheel 527 MB）**不装**：默认配置走云端。
# 要在容器里跑本地推理，自行加一层 `pip install -r celery-worker/requirements-local-embedding.txt`。

RUN apt-get update \
    && apt-get install -y --no-install-recommends build-essential \
    && pip install --no-cache-dir -r /app/requirements.txt \
    && apt-get purge -y --auto-remove build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY celery-worker/ /app/

RUN addgroup --system --gid 1001 revornix \
    && adduser --system --uid 1001 --ingroup revornix revornix \
    && mkdir -p /app/logs \
    && chown -R revornix:revornix /app \
    && chmod +x /app/start-worker.sh
USER revornix

# start-worker.sh 会把服务目录放进 PYTHONPATH 再启动 celery
CMD ["/app/start-worker.sh"]
