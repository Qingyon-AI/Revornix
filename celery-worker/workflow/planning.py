"""编排层的决策规则。

这些规则原本内嵌在工作流节点里，和数据库访问、外部调用混在一条 async 函数中，
于是**没法在不起一整套基础设施的情况下验证**。它们本身却是纯粹的判断：给定文档
体量，决定走哪条处理路径。

单独放在这里有两个理由：

1. 可以被测试直接钉住 —— 这些阈值是**成本闸门**，判错了不会报错，只会让一份
   40 万字的文档去走全量图谱抽取，或者让一份小文档绕进渐进式路径。
2. 规则集中在一处可读，而不是散在 async 函数中间。

本模块只依赖标准库，因此测试不需要 worker 的运行时依赖树。
"""

from __future__ import annotations

from dataclasses import dataclass

# ---- 文档处理路径 ----------------------------------------------------------

#: 超过这个体量就不再一次处理完，改用渐进式：先把核心向量化交出去，其余作为
#: 后续任务补齐。
PROGRESSIVE_PROCESS_MARKDOWN_CHAR_THRESHOLD = 100_000

#: 渐进式下先行处理的分块数，用来尽快得到一个最小可用结果。
PROGRESSIVE_BOOTSTRAP_CHUNK_LIMIT = 24

#: 超过这个体量连自动图谱都关掉 —— 抽实体关系的成本随长度非线性上升。这是一条
#: 主动的成本闸门，不是等超时后被动失败。
ULTRA_LARGE_DOCUMENT_MARKDOWN_CHAR_THRESHOLD = 400_000

# ---- 播客取材 --------------------------------------------------------------

#: 超过这个体量优先用已有摘要，而不是全文。
SUMMARY_PREFERRED_MARKDOWN_CHAR_THRESHOLD = 80_000

#: 连摘要都没有、且超过这个体量时，退而采样若干分块。
SAMPLED_PODCAST_MARKDOWN_CHAR_THRESHOLD = 180_000

#: 采样模式取多少个分块。
SAMPLED_PODCAST_CHUNK_LIMIT = 10


@dataclass(frozen=True)
class DocumentProcessingPlan:
    """一份文档该怎么处理。"""

    progressive: bool
    """是否走渐进式：先交付核心向量化，其余作为后续任务。"""

    auto_graph: bool
    """是否自动构建知识图谱。仅在渐进式下有意义 —— 非渐进式路径由下游自行决定。"""

    bootstrap_chunk_limit: int | None
    """渐进式下先行处理的分块数；非渐进式为 None。"""


def plan_document_processing(*, markdown_length: int) -> DocumentProcessingPlan:
    """按文档体量决定处理路径。"""
    if markdown_length < PROGRESSIVE_PROCESS_MARKDOWN_CHAR_THRESHOLD:
        return DocumentProcessingPlan(
            progressive=False,
            auto_graph=True,
            bootstrap_chunk_limit=None,
        )
    return DocumentProcessingPlan(
        progressive=True,
        # 注意是严格小于：正好到达超大阈值的文档就该关掉图谱。
        auto_graph=markdown_length < ULTRA_LARGE_DOCUMENT_MARKDOWN_CHAR_THRESHOLD,
        bootstrap_chunk_limit=PROGRESSIVE_BOOTSTRAP_CHUNK_LIMIT,
    )


def should_prefer_summary_source(*, markdown_length: int) -> bool:
    """播客是否应该优先拿摘要当素材，而不是全文。

    只回答「该不该去找摘要」。真的有没有摘要要查库，所以判断和取数分开 ——
    合成一个函数会让小文档也白白查一次库。
    """
    return markdown_length >= SUMMARY_PREFERRED_MARKDOWN_CHAR_THRESHOLD


def should_sample_chunks(*, markdown_length: int) -> bool:
    """在拿不到摘要时，是否退化成采样分块（而不是硬啃全文）。"""
    return markdown_length >= SAMPLED_PODCAST_MARKDOWN_CHAR_THRESHOLD
