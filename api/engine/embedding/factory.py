from dotenv import load_dotenv

load_dotenv(override=True)

import os

from common.env import is_env_enabled


def get_embedding_engine():
    """按配置选 embedding 引擎。

    两个分支都**用到才 import**。本地那个拖着 torch + sentence_transformers
    （wheel 527 MB，装完约 1.3 GB），而默认配置（ALI_DASHSCOPE_EMBEDDING_ON=True）
    一次都不会走到它 —— 顶层 import 等于让每个部署都为一个永不执行的分支付钱。

    torch 也因此从 requirements.txt 移到了 requirements-local-embedding.txt。
    没装它的环境走到那一行会得到 ImportError，而那正是想要的：明确告诉部署方
    "你选了本地引擎却没装它的依赖"，而不是让所有人默默多背 1.3 GB。

    MIRRORED-FILE: api/ <-> celery-worker/ —— 两侧必须逐字节一致，由 scripts/check_mirrored_files.py 强制。
    """
    if is_env_enabled(os.getenv("ALI_DASHSCOPE_EMBEDDING_ON")):
        from engine.embedding.qwen_cloud import CloudQwen3EmbeddingEngine

        return CloudQwen3EmbeddingEngine()

    from engine.embedding.qwen_local import LocalQwen3EmbeddingEngine

    return LocalQwen3EmbeddingEngine()
