# 1. 编译阶段（含编译器和构建工具）
FROM python:3.11-slim AS builder

WORKDIR /app

RUN apt-get update -o Acquire::Check-Valid-Until=false && \
  apt-get install -y --no-install-recommends \
  gcc g++ make wget sudo \
  libnss3 libnspr4 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 \
  libxkbcommon0 libxcomposite1 libxdamage1 libxfixes3 libxrandr2 libgbm1 \
  libpango-1.0-0 libcairo2 libasound2 fonts-liberation libappindicator3-1 && \
  apt-get clean && rm -rf /var/lib/apt/lists/*

# 设置 Playwright 浏览器缓存路径，避免装在用户目录
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

# 安装 Playwright 及其依赖浏览器
RUN pip install --no-cache-dir playwright && \
    playwright install --with-deps chromium

COPY ./requirements.txt /app/requirements.txt

RUN pip install --no-cache-dir -r requirements.txt

COPY . /app

# 第二阶段：运行环境，只保留运行时依赖和浏览器，去掉编译工具等
FROM python:3.11-slim

WORKDIR /app

# 安装运行时依赖（无编译工具）
RUN echo 'Acquire::Retries "5";' > /etc/apt/apt.conf.d/80-retries && \ 
  apt-get update -o Acquire::Check-Valid-Until=false && \
  apt-get install -y --no-install-recommends \
  libnss3 libnspr4 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 \
  libxkbcommon0 libxcomposite1 libxdamage1 libxfixes3 libxrandr2 libgbm1 \
  libpango-1.0-0 libcairo2 libasound2 fonts-liberation libappindicator3-1 && \
  apt-get clean && rm -rf /var/lib/apt/lists/*

# 复制第一阶段安装的 Python 依赖
COPY --from=builder /usr/local /usr/local

# 复制 Playwright 浏览器缓存目录
COPY --from=builder /ms-playwright /ms-playwright

# 复制应用代码
COPY --from=builder /app /app