"""阶段的失败语义。

这里测的是控制流本身,不是某个计算结果:谁的失败该往上传、谁的不该、以及
「记录失败」这件事自己失败时会发生什么。

这三条决定了一份文档处理到一半出错时,用户看到的是「部分完成」还是「整份失败」,
而它们此前只体现为某个 except 块末尾有没有 raise。
"""

from __future__ import annotations

import pytest

from workflow.stages import (
    record_failure_safely,
    run_critical_stage,
    run_optional_stage,
)


class Boom(Exception):
    """被测代码里抛出的"原始"异常。"""


class RecorderBoom(Exception):
    """记录失败这一步自己抛出的异常 —— 它绝不该顶替 Boom。"""


class TestRecordFailureSafely:
    @pytest.mark.asyncio
    async def test_passes_the_original_error_to_the_recorder(self):
        seen: list[BaseException] = []

        async def record(error):
            seen.append(error)

        original = Boom("图谱构建失败")
        ok = await record_failure_safely(record=record, error=original, what="graph task")

        assert ok is True
        assert seen == [original]

    @pytest.mark.asyncio
    async def test_recorder_failure_is_swallowed(self):
        # 关键:调用方几乎总是在 except 块里调用它。这里抛出会替换掉正在传播的
        # 原始异常,让排查看到完全错误的线索。
        async def record(error):
            raise RecorderBoom("数据库连不上")

        ok = await record_failure_safely(
            record=record, error=Boom("原始错误"), what="graph task"
        )
        assert ok is False


class TestOptionalStage:
    @pytest.mark.asyncio
    async def test_success_returns_the_value_and_does_not_record(self):
        recorded: list[BaseException] = []

        async def record(error):
            recorded.append(error)

        ok, value = await run_optional_stage(
            run=lambda: _returns("图谱已构建"), record_failure=record, what="graph"
        )
        assert (ok, value) == (True, "图谱已构建")
        assert recorded == []

    @pytest.mark.asyncio
    async def test_failure_does_not_propagate(self):
        # 可选阶段的全部意义:它的失败不该拖垮已经完成的核心工作
        async def record(error):
            return None

        ok, value = await run_optional_stage(
            run=lambda: _raises(Boom("neo4j 不可达")),
            record_failure=record,
            what="graph",
        )
        assert ok is False
        assert value is None

    @pytest.mark.asyncio
    async def test_failure_is_recorded_with_the_original_error(self):
        recorded: list[BaseException] = []

        async def record(error):
            recorded.append(error)

        original = Boom("neo4j 不可达")
        await run_optional_stage(
            run=lambda: _raises(original), record_failure=record, what="graph"
        )
        assert recorded == [original]

    @pytest.mark.asyncio
    async def test_recorder_failure_still_does_not_propagate(self):
        # 两重失败叠加时也必须保持沉默 —— 否则可选阶段就变成了能掀翻整条链
        async def record(error):
            raise RecorderBoom("状态写不进去")

        ok, _ = await run_optional_stage(
            run=lambda: _raises(Boom("neo4j 不可达")),
            record_failure=record,
            what="graph",
        )
        assert ok is False


class TestCriticalStage:
    @pytest.mark.asyncio
    async def test_success_returns_the_value_and_does_not_record(self):
        recorded: list[BaseException] = []

        async def record(error):
            recorded.append(error)

        value = await run_critical_stage(
            run=lambda: _returns(42), record_failure=record, what="embedding"
        )
        assert value == 42
        assert recorded == []

    @pytest.mark.asyncio
    async def test_failure_propagates_the_original_exception(self):
        async def record(error):
            return None

        original = Boom("向量化失败")
        with pytest.raises(Boom) as caught:
            await run_critical_stage(
                run=lambda: _raises(original), record_failure=record, what="embedding"
            )
        # 必须是原样抛出,不是包装过的:上层靠类型判断重试与定位
        assert caught.value is original

    @pytest.mark.asyncio
    async def test_failure_is_recorded_before_propagating(self):
        recorded: list[BaseException] = []

        async def record(error):
            recorded.append(error)

        original = Boom("向量化失败")
        with pytest.raises(Boom):
            await run_critical_stage(
                run=lambda: _raises(original), record_failure=record, what="embedding"
            )
        assert recorded == [original]

    @pytest.mark.asyncio
    async def test_recorder_failure_never_masks_the_original(self):
        # 整个模块里最要紧的一条:真正的错误不能被一个"状态写不进去"的次要错误顶替
        async def record(error):
            raise RecorderBoom("数据库连不上")

        original = Boom("向量化失败")
        with pytest.raises(Boom) as caught:
            await run_critical_stage(
                run=lambda: _raises(original), record_failure=record, what="embedding"
            )
        assert caught.value is original
        assert not isinstance(caught.value, RecorderBoom)


async def _returns(value):
    return value


async def _raises(error: BaseException):
    raise error
