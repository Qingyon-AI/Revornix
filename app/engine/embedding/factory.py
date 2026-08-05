from dotenv import find_dotenv, load_dotenv

# usecwd=True 很关键：load_dotenv 默认从**调用方文件所在目录**向上找 .env，
# 而这个模块搬进 app/ 之后，那条路径通向仓库根 —— 那里恰好也有一个 .env，
# 于是它会**静默读到另一份配置**（比找不到更糟）。两个服务都从各自目录启动，
# 按工作目录找才是原来的语义。
load_dotenv(find_dotenv(usecwd=True), override=True)

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
