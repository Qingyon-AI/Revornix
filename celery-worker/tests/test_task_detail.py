"""任务失败详情的渲染。

每个任务节点失败时把原因写进自己那一行的 `detail`，前端在对应任务卡片里展示。
这段逻辑被九张任务表的失败路径共用，而它出错的方式很安静：截断没做对就是一次
写库时的 `DataError`（列宽 1000），异常渲染丢了信息就是用户看到一张只写着
"失败"的卡片。

注意：本模块在 api/ 与 celery-worker/ 下是镜像的（带 MIRRORED-FILE 标记，
由 scripts/check_mirrored_files.py 保证两侧一致），所以这里测一次即可。
"""

from __future__ import annotations

from common.task_detail import (
    MAX_TASK_DETAIL_LENGTH,
    format_task_error,
    truncate_task_detail,
)


class TestTruncate:
    def test_none_stays_none(self):
        assert truncate_task_detail(None) is None

    def test_blank_becomes_none(self):
        # 空字符串写进库没有意义，卡片上会显示一个空的详情块
        assert truncate_task_detail("   ") is None
        assert truncate_task_detail("") is None

    def test_surrounding_whitespace_is_stripped(self):
        assert truncate_task_detail("  出错了  ") == "出错了"

    def test_short_text_is_unchanged(self):
        assert truncate_task_detail("连接超时") == "连接超时"

    def test_exactly_at_limit_is_not_truncated(self):
        text = "x" * MAX_TASK_DETAIL_LENGTH
        assert truncate_task_detail(text) == text

    def test_over_limit_fits_within_the_column(self):
        # 列宽就是 MAX_TASK_DETAIL_LENGTH，超一个字符都会让写库失败
        out = truncate_task_detail("x" * (MAX_TASK_DETAIL_LENGTH + 500))
        assert out is not None
        assert len(out) <= MAX_TASK_DETAIL_LENGTH

    def test_truncation_is_marked(self):
        out = truncate_task_detail("x" * (MAX_TASK_DETAIL_LENGTH + 1))
        assert out is not None and out.endswith("...")


class TestFormatTaskError:
    def test_includes_type_and_message(self):
        out = format_task_error(ValueError("模型未配置"))
        assert "ValueError" in out
        assert "模型未配置" in out

    def test_empty_message_falls_back_to_type_name(self):
        # raise RuntimeError() 很常见，只写 "RuntimeError" 也比一片空白强
        assert format_task_error(RuntimeError()) == "RuntimeError"

    def test_whitespace_only_message_falls_back_to_type_name(self):
        assert format_task_error(RuntimeError("   ")) == "RuntimeError"

    def test_custom_exception_type_is_preserved(self):
        class GraphBuildError(Exception):
            pass

        assert format_task_error(GraphBuildError("neo4j 不可达")).startswith(
            "GraphBuildError"
        )

    def test_long_message_fits_within_the_column(self):
        # 上游异常经常带一大段响应体，直接写库会炸列宽
        out = format_task_error(ValueError("详情 " * 5000))
        assert len(out) <= MAX_TASK_DETAIL_LENGTH

    def test_never_returns_empty(self):
        # 返回空会让卡片显示一个没有内容的详情块，比不显示更糟
        for exc in (Exception(), ValueError(""), RuntimeError("\n\t ")):
            assert format_task_error(exc)
