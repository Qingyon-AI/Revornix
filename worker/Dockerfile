# 构建上下文是**仓库根**，不是 worker/ —— workspace 的锁文件和 app/ 都在根上。
# 对应的构建命令：docker build -f worker/Dockerfile .
FROM python:3.11-slim AS base

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy

# 不设 UV_CACHE_DIR：下面每条 uv sync 都带 --no-cache，用不到缓存目录。
# （曾经必须设：revornix 是系统用户、没有家目录，uv 默认会去 /nonexistent/.cache
# 建缓存然后失败。而且 ENV 的 shell 形式不支持行内注释，写在那里会被当成值的一部分。）
COPY --from=ghcr.io/astral-sh/uv:0.9.30 /uv /usr/local/bin/uv

# 用户在**装依赖之前**建好，后面所有 COPY 都直接带 --chown。
# 曾经是最后来一句 `chown -R /src` —— 那会把整个 venv 的每个文件在新层里
# 重写一遍，单这一层就 1.85 GB。归属要在写入时定，不能事后改。
RUN addgroup --system --gid 1001 revornix \
    && adduser --system --uid 1001 --ingroup revornix revornix \
    && mkdir -p /src && chown -R revornix:revornix /src
USER revornix

WORKDIR /src

# 依赖层：只 COPY 各包的 pyproject 与锁文件，不带代码。
# 这样改业务代码不会让依赖层失效。--no-install-workspace：此刻还没 COPY 代码，
# 装 workspace 成员本身会因为找不到包目录而失败。--locked 保证装的就是锁文件里那一套，
# 连传递依赖也钉死，构建到哪天都一样。
COPY --chown=revornix:revornix pyproject.toml uv.lock ./
COPY --chown=revornix:revornix app/pyproject.toml app/
COPY --chown=revornix:revornix api/pyproject.toml api/
COPY --chown=revornix:revornix worker/pyproject.toml worker/
# 依赖层。这里有三件事都是量出来的，改动前请先量：
#
# 1. **不装 build-essential。** 锁文件里 305 个包全都有 wheel，一个都不需要现场编译。
#    装了再 purge 也没用：purge 在后面的层，删不掉前一层已经存进去的 344 MB。
#    真需要编译某个新依赖时，把 apt 装、uv sync、apt purge 写进**同一个 RUN**。
# 2. **--no-cache。** 缓存目录同样是"写在这一层、删在下一层"，白留 1.2 GB。
#    这里只 sync 一次，缓存本来也没有第二次可复用。
# 3. **全程 revornix 身份，一次 chown 都不做。** overlayfs 里改属主会把每个文件
#    copy-up 到新层，`chown -R /src` 等于把整个 venv 再存一份 —— 实测 3.02 GB。
#
# 三条合起来：8.69 GB → 2.83 GB。
RUN uv sync --locked --no-cache --no-install-workspace --package revornix-worker

# 代码层
COPY --chown=revornix:revornix app/ app/
COPY --chown=revornix:revornix worker/ worker/
RUN uv sync --locked --no-cache --package revornix-worker

# 本地 embedding（torch，527 MB）**不装**：默认走云端。要在容器里跑本地推理，
# 自行加一层 `uv sync --locked --package revornix-worker --extra local-embedding`。

RUN mkdir -p /src/worker/logs

# WorkingDirectory 是承重的：BASE_DIR（日志）与 load_dotenv(usecwd=True)（读哪份
# .env）都按它取值。放在别处会读到仓库根那份配置。
WORKDIR /src/worker
ENV PATH="/src/.venv/bin:$PATH"

CMD ["celery", "-A", "common.celery.app", "worker", "--pool=threads", "--concurrency=20", "--loglevel=info", "-E"]
