FROM python:3.11-slim

WORKDIR /app

# Install the system dependent packages
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