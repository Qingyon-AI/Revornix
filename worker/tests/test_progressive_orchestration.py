"""渐进式后续任务的编排结构。

大文档走渐进式时,剩余工作被组装成一个 celery chord。**编排的语义几乎全在结构里**:

- 核心的 embedding 余量放在 chord 的 header,且用会抛错的任务 —— 它失败时 chord
  出错,完成通知不会发;
- 可选后续(图谱/摘要/播客)用吞错的包装,永远不会让 chord 失败;
- 于是「通知发出」恰好等价于「核心 embedding 成功」。

这三条此前没有任何东西验证。真跑一遍要起 celery、数据库、向量库,属于集成测试;
但**组装**是纯逻辑,把它和投递分开之后就能直接断言 —— 这里测的正是它。
"""

from __future__ import annotations

import pytest

# celery 只有 11 MB，装它换来对编排结构的覆盖是划算的
celery = pytest.importorskip("celery")

from workflow.orchestration import (  # noqa: E402
    PROGRESSIVE_BOOTSTRAP_CHUNK_LIMIT,
    build_progressive_followup_workflow,
)

CORE_EMBEDDING = "common.celery.app.start_process_document_embedding"
OPTIONAL_WRAPPER = "common.celery.app.run_progressive_followup"
FINALIZE = "common.celery.app.start_finalize_document_process"
SNAPSHOT = "common.celery.app.start_prepare_document_chunk_snapshot"


def build(**overrides):
    kwargs = dict(
        document_id=7,
        user_id=3,
        auto_summary=False,
        auto_podcast=False,
        auto_graph=False,
    )
    kwargs.update(overrides)
    return build_progressive_followup_workflow(**kwargs)


def chord_of(workflow):
    """chain 的第二环就是那个 chord。"""
    return workflow.tasks[1]


def header_of(workflow):
    """chord 的 header。

    注意 celery 会把传进去的 group **展开**，所以这里直接就是 signature 列表，
    而不是还包着一层 group —— 这是实测出来的，不是文档上的形状。
    """
    return list(chord_of(workflow).tasks)


def header_names(workflow) -> list[str]:
    return [sig["task"] for sig in header_of(workflow)]


def optional_kinds(workflow) -> list[str]:
    return [
        sig["kwargs"]["kind"]
        for sig in header_of(workflow)
        if sig["task"] == OPTIONAL_WRAPPER
    ]


class TestShape:
    def test_chain_starts_with_the_snapshot_step(self):
        # 后续任务都基于同一份分块快照，它必须先于 chord 完成
        assert build().tasks[0]["task"] == SNAPSHOT

    def test_core_embedding_is_always_in_the_header(self):
        assert CORE_EMBEDDING in header_names(build())

    def test_finalize_is_the_callback_not_a_header_member(self):
        # 完成通知必须是 callback：放进 header 就变成"与核心并行"，
        # 那样 embedding 还没成功就会把通知发出去
        workflow = build()
        assert chord_of(workflow).body["task"] == FINALIZE
        assert FINALIZE not in header_names(workflow)

    def test_core_embedding_resumes_after_the_bootstrap_chunks(self):
        # 渐进式的前提：先行处理过的分块不能再算一遍
        sig = next(
            s for s in header_of(build()) if s["task"] == CORE_EMBEDDING
        )
        assert sig["kwargs"]["start_chunk_idx"] == PROGRESSIVE_BOOTSTRAP_CHUNK_LIMIT


class TestFailureIsolation:
    """结构决定了谁的失败能拖垮通知。"""

    def test_optional_followups_go_through_the_swallowing_wrapper(self):
        # 关键：可选后续**不能**直接用各自的任务，那样它们的失败会让 chord 出错、
        # 连带压住完成通知 —— 而已完成的核心工作本该被通知出去
        workflow = build(auto_graph=True, auto_summary=True, auto_podcast=True)
        for sig in header_of(workflow):
            if sig["task"] != CORE_EMBEDDING:
                assert sig["task"] == OPTIONAL_WRAPPER

    def test_core_embedding_does_not_use_the_wrapper(self):
        # 反过来，核心那步绝不能被吞错包住，否则 embedding 失败也会发出"处理完成"
        sig = next(
            s for s in header_of(build()) if s["task"] == CORE_EMBEDDING
        )
        assert sig["task"] != OPTIONAL_WRAPPER


class TestOptionalToggles:
    def test_nothing_optional_by_default(self):
        assert optional_kinds(build()) == []
        assert header_names(build()) == [CORE_EMBEDDING]

    @pytest.mark.parametrize(
        "flag,kind",
        [("auto_graph", "graph"), ("auto_summary", "summarize"), ("auto_podcast", "podcast")],
    )
    def test_each_toggle_adds_exactly_its_own_followup(self, flag, kind):
        workflow = build(**{flag: True})
        assert optional_kinds(workflow) == [kind]

    def test_all_toggles_together(self):
        workflow = build(auto_graph=True, auto_summary=True, auto_podcast=True)
        assert sorted(optional_kinds(workflow)) == ["graph", "podcast", "summarize"]
        # 核心 + 三个可选
        assert len(header_names(workflow)) == 4

    def test_every_signature_is_immutable(self):
        # immutable 很关键：否则上一步的返回值会被当成位置参数塞进下一个任务，
        # 参数错位不会立刻报错，只会让任务拿到莫名其妙的输入
        workflow = build(auto_graph=True, auto_summary=True, auto_podcast=True)
        for sig in header_of(workflow):
            assert sig.immutable is True
        assert chord_of(workflow).body.immutable is True
        assert workflow.tasks[0].immutable is True


class TestIdentifiersArePassedThrough:
    def test_document_and_user_reach_every_step(self):
        workflow = build(document_id=42, user_id=99, auto_graph=True)
        for sig in header_of(workflow):
            assert sig["kwargs"]["document_id"] == 42
            if sig["task"] != FINALIZE:
                assert sig["kwargs"]["user_id"] == 99
        assert chord_of(workflow).body["kwargs"]["document_id"] == 42
