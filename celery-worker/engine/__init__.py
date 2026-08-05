# 本地 embedding 引擎**刻意不在这里导出**。
#
# 它 import torch + sentence_transformers（wheel 527 MB，装完约 1.3 GB），而
# `import engine` 是几乎每条链路都会走到的。默认配置走云端 embedding
# （ALI_DASHSCOPE_EMBEDDING_ON），那种部署根本不该为一个永不执行的分支付这个钱。
#
# 需要它的地方从子模块取：`from engine.embedding.qwen_local import ...`，
# 而 factory 只在真正选中本地引擎时才 import。
from .embedding.qwen_cloud import CloudQwen3EmbeddingEngine
from .image_generate.bailian import BailianImageGenerateEngine
from .image_generate.banana import BananaImageGenerateEngine
from .image_generate.openai_image import OpenAIImageGenerateEngine
from .image_generate.volc import VolcImageGenerateEngine
from .image_understand.kimi import KimiImageUnderstandEngine
from .markdown.mineru_api import MineruApiEngine
from .markdown.markitdown import MarkitdownEngine
from .markdown.jina import JinaEngine
from .tts.openai_audio import OpenAIAudioEngine
from .tts.volc.tts import VolcTTSEngine
from .stt.volc_fast import VolcSTTFastEngine
from .stt.volc_standard import VolcSTTStandardEngine

__all__ = [
    "BailianImageGenerateEngine",
    "BananaImageGenerateEngine",
    "CloudQwen3EmbeddingEngine",
    "JinaEngine",
    "KimiImageUnderstandEngine",
    "MineruApiEngine",
    "MarkitdownEngine",
    "OpenAIAudioEngine",
    "OpenAIImageGenerateEngine",
    "VolcImageGenerateEngine",
    "VolcTTSEngine",
    "VolcSTTFastEngine",
    "VolcSTTStandardEngine"
]
