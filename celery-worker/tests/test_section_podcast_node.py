"""专栏播客节点，以及取消异常本身。

这个节点里有一条很典型的可选依赖：图谱上下文。它是**锦上添花**的素材，拿不到时
播客照样该做出来 —— 所以它的失败被吞掉了。吞错本身是对的，但吞错的代码有个通病：
出错之后忘了把状态复位，于是半个失败的结果被当成成功的用下去。

这里把两件事都钉住：失败被吞掉，且失败后状态是干净的。
"""

from __future__ import annotations

import pytest

from workflow import section_podcast_workflow as node
from workflow.cancelled import WorkflowCancelledError


class TestGraphContextIsOptional:
    @pytest.fixture
    def wired(self, monkeypatch):
        rec = {"prepared_with": None}

        def wire(*, graph_result, markdown="正文"):
            async def _cancel(section_id):
                return None

            class FakeFileSystem:
                @staticmethod
                async def create(**kwargs):
                    return object()

            async def _markdown(**kwargs):
                return markdown

            async def _graph(**kwargs):
                if isinstance(graph_result, Exception):
                    raise graph_result
                return graph_result

            def _prepare(*, markdown, title, description):
                rec["prepared_with"] = markdown
                # 让节点在这里停下：再往后是 TTS 引擎，属于外部系统
                raise _StopHere

            monkeypatch.setattr(
                node, "_ensure_section_podcast_task_not_cancelled", _cancel
            )
            monkeypatch.setattr(node, "FileSystemProxy", FakeFileSystem)
            monkeypatch.setattr(node, "get_markdown_content_by_section_id", _markdown)
            monkeypatch.setattr(
                node, "build_section_podcast_graph_context", _graph
            )
            monkeypatch.setattr(node, "prepare_podcast_markdown", _prepare)
            return rec

        return wire

    def _state(self, **overrides):
        state = {"section_id": 1, "user_id": 2, "engine_id": 3}
        state.update(overrides)
        return state

    async def test_graph_context_is_appended_when_available(self, wired):
        rec = wired(graph_result=("图谱素材", {"entities": 3, "relations": 2, "excerpts": 1}))
        state = self._state()
        with pytest.raises(_StopHere):
            await node._generate_section_podcast(state)

        assert "图谱素材" in rec["prepared_with"]
        assert state["graph_context_used"] is True

    async def test_a_failing_graph_context_does_not_stop_the_podcast(self, wired):
        # 图谱只是素材。让它拖垮整个播客，等于因为配菜没做好就不上主菜
        rec = wired(graph_result=RuntimeError("图谱查询失败"))
        state = self._state()
        with pytest.raises(_StopHere):
            await node._generate_section_podcast(state)

        assert rec["prepared_with"] == "正文"
        assert state["graph_context_used"] is False

    async def test_an_empty_graph_context_is_recorded_as_unused(self, wired):
        # 空字符串不是失败，但也不该被当成"用上了" —— 埋点会因此虚高
        rec = wired(graph_result=("", {"entities": 0, "relations": 0, "excerpts": 0}))
        state = self._state()
        with pytest.raises(_StopHere):
            await node._generate_section_podcast(state)

        assert state["graph_context_used"] is False
        assert rec["prepared_with"] == "正文"

    @pytest.mark.parametrize("missing", ["section_id", "user_id", "engine_id"])
    async def test_missing_context_fails_fast(self, missing):
        state = self._state()
        del state[missing]
        with pytest.raises(Exception, match="missing context"):
            await node._generate_section_podcast(state)


class _StopHere(Exception):
    """哨兵：跑到 TTS 之前停下。再往后是外部系统，不在本用例范围。"""


class TestCancelledError:
    def test_it_is_a_plain_exception(self):
        # 各个工作流用 `except Exception` 兜底记录失败状态。取消若不是 Exception
        # 的子类，就会绕过那些兜底，任务停在"处理中"不动。
        assert issubclass(WorkflowCancelledError, Exception)

    def test_it_carries_its_message(self):
        err = WorkflowCancelledError("document_id=7 已取消")
        assert "document_id=7" in str(err)
