# 构建上下文是**仓库根**，不是 api/ —— 这个服务依赖同级的 shared/。
# 对应的构建命令：docker build -f api/Dockerfile .
FROM python:3.11-slim AS base

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# 依赖层单独一层：只要 requirements 和 shared/ 没变，改业务代码就不必重装。
# torch 那一串装一次要很久，这个分层是有意的。
COPY shared/ /shared/
COPY api/requirements.txt /app/requirements.txt
# 本地 embedding 引擎的依赖（torch，wheel 527 MB）**不装**：默认配置走云端。
# 要在容器里跑本地推理，自行加一层 `pip install -r api/requirements-local-embedding.txt`。

# 编译型依赖需要工具链，装完即删 —— 它们不该留在运行镜像里。
RUN apt-get update \
    && apt-get install -y --no-install-recommends build-essential curl \
    && pip install --no-cache-dir -r /app/requirements.txt \
    && apt-get purge -y --auto-remove build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY api/ /app/

# 以非 root 运行
RUN addgroup --system --gid 1001 revornix \
    && adduser --system --uid 1001 --ingroup revornix revornix \
    && mkdir -p /app/logs \
    && chown -R revornix:revornix /app
USER revornix

EXPOSE 8001

# 表结构自愈与种子数据由应用启动时自己完成（见 data/sql/bootstrap.py），
# 所以这里不需要任何 entrypoint 迁移脚本。
CMD ["fastapi", "run", "main.py", "--port", "8001", "--host", "0.0.0.0"]
