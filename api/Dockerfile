# 1. 编译阶段（含编译器和构建工具）
FROM python:3.11-slim AS builder

WORKDIR /app

RUN apt-get update -o Acquire::Check-Valid-Until=false && \
    apt-get install -y --no-install-recommends gcc g++ make && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

COPY ./requirements.txt /app/requirements.txt

# 安装依赖到 /install 目录，不用系统默认目录
RUN pip wheel --wheel-dir=/wheels -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple
RUN pip install --no-cache /wheels/*.whl --target=/install

COPY . /app

# 2. 运行阶段（只保留运行环境）
FROM python:3.11-slim

WORKDIR /app

# 复制编译好的依赖包
COPY --from=builder /install /usr/local

# 复制应用代码
COPY --from=builder /app /app