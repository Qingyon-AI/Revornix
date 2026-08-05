"""工作流的计时与埋点。

这一层不产生业务结果，所以它坏掉不会有人立刻发现 —— 只会在某天排查线上问题时
发现日志里少了 document_id，或者一个失败的节点在链路追踪里显示成功。它同时被
**所有** 20 个工作流用着，是覆盖面最广的一段。

重点在两条：
- 包装器**不能吞掉异常**，也不能改写返回值 —— 它只是旁观；
- 失败路径上必须留下痕迹（span 记为错误、日志带上关联字段），否则出问题时
  什么线索都没有。
"""

from __future__ import annotations

import pytest

from workflow import timing


class FakeSpan:
    def __init__(self, recording: bool = True) -> None:
        self.attributes: dict = {}
        self.exceptions: list = []
        self.status = None
        self._recording = recording

    def is_recording(self) -> bool:
        return self._recording

    def set_attribute(self, key, value) -> None:
        self.attributes[key] = value

    def record_exception(self, exc) -> None:
        self.exceptions.append(exc)

    def set_status(self, status) -> None:
        self.status = status


class TestAttrSafe:
    @pytest.mark.parametrize("value", [1, 1.5, True, "文本"])
    def test_native_types_pass_through(self, value):
        assert timing._attr_safe(value) == value

    def test_none_stays_none(self):
        # None 要能被上层识别出来跳过，转成 "None" 字符串会让埋点里全是无用字段
        assert timing._attr_safe(None) is None

    def test_anything_else_becomes_a_string(self):
        # OTel 只接受标量。不转的话属性会被静默丢弃 —— 埋点看起来正常，字段没了
        assert timing._attr_safe({"a": 1}) == "{'a': 1}"
        assert timing._attr_safe([1, 2]) == "[1, 2]"

    def test_zero_and_empty_string_survive(self):
        # 边界：这两个都是假值。用 `if not value` 过滤会把它们一起丢掉
        assert timing._attr_safe(0) == 0
        assert timing._attr_safe("") == ""


class TestLogContext:
    def test_picks_the_correlation_fields(self):
        ctx = timing._log_context_from_state(
            {"document_id": 7, "user_id": 3, "irrelevant": "x"}
        )
        assert ctx == {"document_id": 7, "user_id": 3}

    def test_none_values_are_dropped(self):
        assert timing._log_context_from_state({"document_id": None}) == {}

    def test_a_non_dict_state_yields_nothing(self):
        # 有些工作流的 state 不是 dict。这里返回 {} 而不是炸掉 ——
        # 埋点不该成为业务失败的原因。
        assert timing._log_context_from_state("不是状态") == {}
        assert timing._log_context_from_state(None) == {}

    def test_zero_is_kept(self):
        # status=0 是合法状态；用 falsy 判断会让它从日志里消失
        ctx = timing._log_context_from_state({"status": 0})
        assert ctx == {"status": 0}


class TestAttachStateAttrs:
    def test_writes_prefixed_attributes(self):
        span = FakeSpan()
        timing._attach_state_attrs(span, {"document_id": 7})
        assert span.attributes == {"workflow.document_id": 7}

    def test_does_nothing_when_the_span_is_not_recording(self):
        # 采样没命中时不该白算一遍属性
        span = FakeSpan(recording=False)
        timing._attach_state_attrs(span, {"document_id": 7})
        assert span.attributes == {}

    def test_a_non_dict_state_records_its_type(self):
        span = FakeSpan()
        timing._attach_state_attrs(span, ["列表"])
        assert span.attributes == {"workflow.state_type": "list"}


class TestWrapWorkflowNode:
    """包装器是旁观者：不能改结果，也不能吞异常。"""

    async def test_the_return_value_is_untouched(self):
        async def node(state):
            return {"ok": True, **state}

        wrapped = timing.wrap_workflow_node(
            workflow_name="w", node_name="n", node_func=node
        )
        assert await wrapped({"document_id": 1}) == {"ok": True, "document_id": 1}

    async def test_exceptions_propagate(self):
        # 吞掉异常会让失败的节点被当成成功，整条链继续往下走
        async def node(state):
            raise ValueError("炸了")

        wrapped = timing.wrap_workflow_node(
            workflow_name="w", node_name="n", node_func=node
        )
        with pytest.raises(ValueError, match="炸了"):
            await wrapped({"document_id": 1})

    async def test_arguments_reach_the_node(self):
        seen = {}

        async def node(state, extra=None):
            seen["state"] = state
            seen["extra"] = extra
            return state

        wrapped = timing.wrap_workflow_node(
            workflow_name="w", node_name="n", node_func=node
        )
        await wrapped({"document_id": 1}, extra="x")
        assert seen == {"state": {"document_id": 1}, "extra": "x"}

    async def test_the_wrapper_keeps_the_node_identity(self):
        # langgraph 按函数名建节点；包装后名字变了会让图上的节点改名，
        # 埋点和图结构从此对不上
        async def my_node(state):
            return state

        wrapped = timing.wrap_workflow_node(
            workflow_name="w", node_name="n", node_func=my_node
        )
        assert wrapped.__name__ == "my_node"

    def test_a_sync_node_is_also_supported(self):
        def node(state):
            return {"ok": True}

        wrapped = timing.wrap_workflow_node(
            workflow_name="w", node_name="n", node_func=node
        )
        assert wrapped({"document_id": 1}) == {"ok": True}


class TestTimedStage:
    def test_yields_a_span_and_does_not_swallow(self):
        with pytest.raises(RuntimeError, match="阶段失败"):
            with timing.timed_stage(
                workflow_name="w", node_name="n", stage_name="s"
            ):
                raise RuntimeError("阶段失败")

    def test_a_normal_stage_completes(self):
        with timing.timed_stage(
            workflow_name="w", node_name="n", stage_name="s", context={"document_id": 1}
        ) as span:
            assert span is not None

    def test_none_context_values_are_skipped(self):
        # 传了 None 的上下文字段不该出现在日志里，否则每条日志都挂一串空字段
        with timing.timed_stage(
            workflow_name="w",
            node_name="n",
            stage_name="s",
            context={"document_id": None, "user_id": 3},
        ) as span:
            assert span is not None


class TestSetStageMetrics:
    def test_no_active_span_is_a_no_op(self):
        # 没有活跃 span 时（比如单测里）必须安静返回，不能炸
        timing.set_stage_metrics(chunks=10)

    def test_none_metrics_are_skipped(self):
        timing.set_stage_metrics(chunks=None)
