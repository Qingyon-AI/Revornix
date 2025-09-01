# ==============================
# 1. 编译阶段（包含编译工具和构建依赖）
# ==============================
FROM python:3.11-slim AS builder

WORKDIR /app

# 使用 HTTPS 替换 Debian 源，增加重试
RUN apt-get update && apt-get install -y --no-install-recommends \
    apt-transport-https ca-certificates && \
    sed -i 's|http://deb.debian.org|https://deb.debian.org|g' /etc/apt/sources.list.d/debian.sources && \
    echo 'Acquire::Retries "5";' > /etc/apt/apt.conf.d/80-retries

# 安装编译工具和运行时库
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
      gcc g++ make wget sudo \
      libnss3 libnspr4 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 \
      libxkbcommon0 libxcomposite1 libxdamage1 libxfixes3 libxrandr2 libgbm1 \
      libpango-1.0-0 libcairo2 libasound2 fonts-liberation libappindicator3-1 \
      libgl1 && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# 设置 Playwright 浏览器缓存路径
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

# 安装 Playwright 及 Chromium
RUN pip install --no-cache-dir playwright && \
    playwright install --with-deps chromium

# 安装 Python 依赖
COPY ./requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# 复制应用代码
COPY . /app

# ==============================
# 2. 运行阶段（只保留运行时依赖和浏览器）
# ==============================
FROM python:3.11-slim

WORKDIR /app

# 使用 HTTPS 替换 Debian 源，增加重试
RUN apt-get update && apt-get install -y --no-install-recommends \
    apt-transport-https ca-certificates && \
    sed -i 's|http://deb.debian.org|https://deb.debian.org|g' /etc/apt/sources.list.d/debian.sources && \
    echo 'Acquire::Retries "5";' > /etc/apt/apt.conf.d/80-retries

# 安装运行时库（无需 gcc/g++/make）
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
      libnss3 libnspr4 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 \
      libxkbcommon0 libxcomposite1 libxdamage1 libxfixes3 libxrandr2 libgbm1 \
      libpango-1.0-0 libcairo2 libasound2 fonts-liberation libappindicator3-1 \
      libgl1 && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# 复制 Python 依赖
COPY --from=builder /usr/local /usr/local

# 复制 Playwright 浏览器缓存
COPY --from=builder /ms-playwright /ms-playwright

# 复制应用代码
COPY --from=builder /app /app
