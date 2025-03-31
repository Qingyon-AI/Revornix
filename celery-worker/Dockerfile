FROM python:3.11-slim

WORKDIR /app

RUN set -ex \
    && apt-get update \
    && apt-get upgrade -y \
    && apt-get install -y wget \
    && apt-get autoremove -y \
    && apt-get clean -y \
    && rm -rf /var/lib/apt/lists/*

RUN pip install playwright && \
    playwright install && \
    playwright install-deps && \
    apt-get install --fix-missing

COPY ./requirements.txt /app/requirements.txt

RUN pip install -r /app/requirements.txt

RUN wget https://github.com/opendatalab/MinerU/raw/master/scripts/download_models_hf.py -O download_models_hf.py && \
    python download_models_hf.py

COPY . /app