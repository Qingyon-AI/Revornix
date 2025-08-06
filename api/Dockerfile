FROM python:3.11-slim

WORKDIR /app

RUN rm -f /etc/apt/sources.list.d/debian.sources \
 && echo "deb http://mirrors.tuna.tsinghua.edu.cn/debian/ bookworm main non-free contrib" > /etc/apt/sources.list \
 && echo "deb http://mirrors.tuna.tsinghua.edu.cn/debian/ bookworm-updates main non-free contrib" >> /etc/apt/sources.list \
 && echo "deb http://mirrors.tuna.tsinghua.edu.cn/debian-security bookworm-security main" >> /etc/apt/sources.list \
 && echo 'Acquire::Retries "5";' > /etc/apt/apt.conf.d/80-retries

# 安装系统依赖
RUN apt-get update -o Acquire::Check-Valid-Until=false \
 && apt-get install -y --no-install-recommends \
    gcc \
    g++ \
    make \
    wget \
    sudo \
    libnss3 \
    libgl1 \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
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

COPY ./requirements.txt /app/requirements.txt

RUN pip install -r /app/requirements.txt

COPY . /app