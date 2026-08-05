"""文档处理主编排节点。

这是整条链的顶层：转写 → 转换 → 覆写 → 打标 → 分块 → 播客 → 置成功。每一步的
**开关语义**和**失败语义**都写在这里，而它们决定了用户看到什么：

- 可选步骤（打标、播客）的失败**不能**拖垮整条链 —— 已经完成的向量化本该被通知出去；
- 但核心步骤（分块）的失败**必须**往上传，否则会发出"处理完成"而其实没成功；
- 大文档走渐进式时，播客要交给后续任务做，在这里做就会重复一次。

这几条此前只体现为「某个 try 块里有没有 except」和「某个 if 提前 return」。
"""

from __future__ import annotations

import pytest

from tests.doubles import FakeDb, Row, async_returning, session_factory
from workflow import document_process_workflow as node


@pytest.fixture
def wired(monkeypatch):
    """接好所有下游工作流与数据库，返回调用记录。"""
    calls: list[str] = []
    db = FakeDb()

    monkeypatch.setattr(node, "async_session_context", session_factory(db))

    async def ensure_active(**kwargs):
        return None

    monkeypatch.setattr(node, "ensure_document_active", ensure_active)

    def runner(name: str, *, fails: bool = False):
        async def _run(**kwargs):
            calls.append(name)
            if fails:
                raise RuntimeError(f"{name} 炸了")

        return _run

    def wire(*, failing: set[str] = frozenset()):
        for name in (
            "run_document_transcribe_workflow",
            "run_document_convert_workflow",
            "run_document_tag_workflow",
            "run_document_podcast_workflow",
            "run_document_chunk_process_workflow",
            "run_document_embedding_workflow",
        ):
            monkeypatch.setattr(node, name, runner(name, fails=name in failing))
        return calls, db

    return wire


class TestOptionalStepsAreGatedByTheirFlag:
    @pytest.mark.parametrize(
        "fn,flag,downstream",
        [
            ("_maybe_transcribe_document", "auto_transcribe", "run_document_transcribe_workflow"),
            ("_maybe_tag_document", "auto_tag", "run_document_tag_workflow"),
        ],
    )
    async def test_off_means_not_run(self, wired, fn, flag, downstream):
        calls, _ = wired()
        await getattr(node, fn)({"document_id": 1, "user_id": 2})
        assert calls == []

    @pytest.mark.parametrize(
        "fn,flag,downstream",
        [
            ("_maybe_transcribe_document", "auto_transcribe", "run_document_transcribe_workflow"),
            ("_maybe_tag_document", "auto_tag", "run_document_tag_workflow"),
        ],
    )
    async def test_on_means_run(self, wired, fn, flag, downstream):
        calls, _ = wired()
        await getattr(node, fn)({"document_id": 1, "user_id": 2, flag: True})
        assert calls == [downstream]

    async def test_convert_is_not_optional(self, wired):
        # 转换没有开关：它是拿到正文的唯一途径，跳过就等于没有内容可处理
        calls, _ = wired()
        await node._convert_document({"document_id": 1, "user_id": 2})
        assert calls == ["run_document_convert_workflow"]


class TestFailureSemantics:
    """谁的失败能拖垮整条链 —— 全部语义都在这几条里。"""

    async def test_podcast_failure_is_swallowed(self, wired):
        # 播客是附加产物。让它拖垮整条链，等于因为播客没做成就不告诉用户
        # 「文档处理完了」—— 而向量化其实已经成功。
        wired(failing={"run_document_podcast_workflow"})
        state = await node._maybe_generate_podcast(
            {"document_id": 1, "user_id": 2, "auto_podcast": True}
        )
        assert state is not None

    async def test_tagging_failure_does_propagate(self, wired):
        # 与播客相反：打标节点自己不吞错。记录现状 —— 这条边界值得被看见，
        # 而不是靠读两处 try 块去推断。
        wired(failing={"run_document_tag_workflow"})
        with pytest.raises(RuntimeError):
            await node._maybe_tag_document(
                {"document_id": 1, "user_id": 2, "auto_tag": True}
            )

    async def test_convert_failure_propagates(self, wired):
        wired(failing={"run_document_convert_workflow"})
        with pytest.raises(RuntimeError):
            await node._convert_document({"document_id": 1, "user_id": 2})


class TestPodcastSkipsWhenProgressive:
    async def test_progressive_defers_the_podcast(self, wired):
        # 走渐进式时播客由后续任务做。在这里再做一次就是重复付一遍模型钱，
        # 而且两次结果会互相覆盖。
        calls, _ = wired()
        await node._maybe_generate_podcast(
            {
                "document_id": 1,
                "user_id": 2,
                "auto_podcast": True,
                "use_progressive_followups": True,
            }
        )
        assert calls == []

    async def test_non_progressive_runs_it_here(self, wired):
        calls, _ = wired()
        await node._maybe_generate_podcast(
            {
                "document_id": 1,
                "user_id": 2,
                "auto_podcast": True,
                "use_progressive_followups": False,
            }
        )
        assert calls == ["run_document_podcast_workflow"]


class TestChunkProcessingBranch:
    @pytest.fixture
    def with_length(self, monkeypatch):
        def wire(length: int):
            async def _len(document_id):
                return length

            monkeypatch.setattr(node, "get_document_markdown_length", _len)

        return wire

    async def test_small_document_goes_through_the_one_shot_path(
        self, wired, with_length
    ):
        calls, _ = wired()
        with_length(1_000)

        state = await node._process_document_chunks(
            {"document_id": 1, "user_id": 2}
        )

        assert calls == ["run_document_chunk_process_workflow"]
        assert state["use_progressive_followups"] is False

    async def test_large_document_bootstraps_then_defers(self, wired, with_length):
        # 渐进式：这里只做引导那一段，剩下的交给编排层。节点自己**不能**把
        # 后续任务也做了 —— 那样用户要等全部做完才看到第一批结果。
        calls, _ = wired()
        with_length(1_000_000)

        state = await node._process_document_chunks(
            {"document_id": 1, "user_id": 2}
        )

        assert calls == ["run_document_embedding_workflow"]
        assert state["use_progressive_followups"] is True

    async def test_the_progressive_decision_is_recorded_in_state(
        self, wired, with_length
    ):
        # 图谱开关由 planning 决定，节点把决定写进 state 供编排层读取。
        # 不写进去的话，编排层只能自己再判一次，两处判断迟早分叉。
        wired()
        with_length(1_000_000)
        state = await node._process_document_chunks({"document_id": 1, "user_id": 2})
        assert "progressive_auto_graph" in state


class TestApplyOverride:
    @pytest.fixture
    def with_document(self, monkeypatch):
        db = FakeDb()

        def wire(document: Row | None):
            monkeypatch.setattr(node, "async_session_context", session_factory(db))

            async def ensure_active(**kwargs):
                return None

            monkeypatch.setattr(node, "ensure_document_active", ensure_active)
            monkeypatch.setattr(
                node.crud,
                "document",
                type(
                    "D",
                    (),
                    {
                        "get_document_by_document_id_async": staticmethod(
                            async_returning(document)
                        )
                    },
                ),
                raising=False,
            )
            return db

        return wire

    async def test_no_override_is_a_no_op(self, with_document):
        db = with_document(Row(title="原标题", description="原描述", cover=None))
        await node._apply_override({"document_id": 1})
        assert db.commits == 0

    async def test_only_the_provided_fields_are_written(self, with_document):
        # 关键：没给的字段不能被覆盖成 None —— 那会把用户已有的标题清空
        doc = Row(title="原标题", description="原描述", cover="原封面")
        db = with_document(doc)

        await node._apply_override({"document_id": 1, "override": {"title": "新标题"}})

        assert doc.title == "新标题"
        assert doc.description == "原描述"
        assert doc.cover == "原封面"
        assert db.commits == 1

    async def test_all_fields_together(self, with_document):
        doc = Row(title="旧", description="旧", cover="旧")
        with_document(doc)
        await node._apply_override(
            {
                "document_id": 1,
                "override": {"title": "新", "description": "新", "cover": "新"},
            }
        )
        assert (doc.title, doc.description, doc.cover) == ("新", "新", "新")

    async def test_a_missing_document_is_an_error(self, with_document):
        # 覆写一个不存在的文档说明上游状态已经不一致，静默跳过会掩盖它
        with_document(None)
        with pytest.raises(Exception, match="not found"):
            await node._apply_override({"document_id": 1, "override": {"title": "x"}})


class TestMarkSuccess:
    async def test_sets_success_and_clears_the_detail(self, monkeypatch):
        # detail 里存着上一次失败的错误信息。不清掉的话，成功的任务卡片上
        # 会一直挂着一条旧报错。
        db = FakeDb()
        task = Row(status=0, detail="上次失败的报错", update_time=None)
        monkeypatch.setattr(node, "async_session_context", session_factory(db))

        async def ensure_active(**kwargs):
            return None

        monkeypatch.setattr(node, "ensure_document_active", ensure_active)
        monkeypatch.setattr(
            node.crud,
            "task",
            type(
                "T",
                (),
                {
                    "get_document_process_task_by_document_id_async": staticmethod(
                        async_returning(task)
                    )
                },
            ),
            raising=False,
        )

        await node._mark_process_success({"document_id": 1})

        assert task.status == node.DocumentProcessStatus.SUCCESS.value
        assert task.detail is None
        assert db.commits == 1

    async def test_missing_document_id_fails_fast(self):
        with pytest.raises(Exception, match="missing document_id"):
            await node._mark_process_success({})
