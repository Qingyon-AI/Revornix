"""渐进式后续任务的 celery 编排 —— 只组装，不投递。

单独成模块是为了让它**可测**：`document_process_workflow` 顶层就 import 了 crud、
langgraph、数据库，导入它等于要装齐整棵运行时依赖树。而编排的正确性几乎全在结构里
（谁在 chord 的 header、谁是 callback、核心那步用的是抛错的任务还是吞错的包装），
把组装单独拿出来，只需要 celery 本身就能断言它。

投递仍在 `document_process_workflow.enqueue_progressive_followups`，那里需要记录
指标、也确实属于流程编排的一环。
"""

from __future__ import annotations

from celery import chain, chord, group, signature

from workflow.planning import PROGRESSIVE_BOOTSTRAP_CHUNK_LIMIT

def build_progressive_followup_workflow(
    *,
    document_id: int,
    user_id: int,
    auto_summary: bool,
    auto_podcast: bool,
    auto_graph: bool,
):
    """组装渐进式后续任务的 celery 编排，**不投递**。

    结构本身就是语义：核心的 embedding 余量放在 chord 的 header 且用会抛错的任务，
    所以它失败时 chord 出错、完成通知不会发；可选后续用吞错的包装，因此永远不会
    让 chord 失败 —— 于是「通知发出」恰好等价于「核心 embedding 成功」。
    """

    def _optional_followup(kind: str) -> object:
        # Optional follow-ups (graph/summary/podcast) run best-effort via the
        # safe wrapper, which records FAILED on their own task and swallows the
        # error. They therefore never fail the chord, so their failure does not
        # block the completion notification.
        return signature(
            "common.celery.app.run_progressive_followup",
            kwargs={
                "kind": kind,
                "document_id": document_id,
                "user_id": user_id,
            },
            immutable=True,
        )

    # The embedding remainder is core: it uses the raising task so that if it
    # fails the chord errors and the finalize callback (completion notification)
    # is NOT fired — matching the non-progressive path where an embedding failure
    # also blocks the notification. Optional follow-ups can't fail the chord, so
    # the callback fires iff the core embedding succeeded.
    header_signatures = [
        signature(
            "common.celery.app.start_process_document_embedding",
            kwargs={
                "document_id": document_id,
                "user_id": user_id,
                "start_chunk_idx": PROGRESSIVE_BOOTSTRAP_CHUNK_LIMIT,
            },
            immutable=True,
        ),
    ]
    if auto_graph:
        header_signatures.append(_optional_followup("graph"))
    if auto_summary:
        header_signatures.append(_optional_followup("summarize"))
    if auto_podcast:
        header_signatures.append(_optional_followup("podcast"))

    finalize_signature = signature(
        "common.celery.app.start_finalize_document_process",
        kwargs={
            "document_id": document_id,
        },
        immutable=True,
    )
    # Fire the "document process completed" notification once, after the core
    # embedding succeeds and every optional follow-up has settled.
    followups_chord = chord(group(header_signatures), finalize_signature)
    workflow = chain(
        signature(
            "common.celery.app.start_prepare_document_chunk_snapshot",
            kwargs={
                "document_id": document_id,
                "user_id": user_id,
            },
            immutable=True,
        ),
        followups_chord,
    )
    return workflow
