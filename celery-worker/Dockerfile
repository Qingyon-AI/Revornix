FROM python:3.11-slim

WORKDIR /app

# 配置阿里云镜像源
RUN rm -f /etc/apt/sources.list.d/debian.sources \
 && echo "deb http://mirrors.aliyun.com/debian/ bookworm main non-free contrib" > /etc/apt/sources.list \
 && echo "deb http://mirrors.aliyun.com/debian/ bookworm-updates main non-free contrib" >> /etc/apt/sources.list \
 && echo "deb http://mirrors.aliyun.com/debian-security bookworm-security main" >> /etc/apt/sources.list

# 安装系统依赖
RUN apt-get update -o Acquire::Check-Valid-Until=false \
 && apt-get install -y --no-install-recommends \
    gcc \
    g++ \
    make \
    wget \
    sudo \
    libnss3 \
    libnspr4 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libpango-1.0-0 \
    libcairo2 \
    libasound2 \
    fonts-liberation \
    libappindicator3-1 \
 && apt-get clean \
 && rm -rf /var/lib/apt/lists/*

# ---------- Playwright 安装 ----------
# ENV PLAYWRIGHT_BROWSERS_PATH=/home/appuser/.cache/ms-playwright
RUN pip install playwright \
 && playwright install --with-deps chromium

# ---------- 项目依赖 ----------
COPY requirements.txt .
RUN pip install -r requirements.txt

# ---------- 应用代码 ----------
COPY . .