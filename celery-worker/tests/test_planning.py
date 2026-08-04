"""编排层的路径决策。

这些阈值是**成本闸门**：判错了不抛异常，只会让一份 40 万字的文档去跑全量图谱
抽取，或者让一份小文档绕进渐进式路径、白白多排几个后续任务。所以这里逐条钉住
边界本身，特别是 >= 与 > 的区别 —— 这类 off-by-one 在代码审查时最容易看漏。
"""

from __future__ import annotations

from workflow.planning import (
    PROGRESSIVE_BOOTSTRAP_CHUNK_LIMIT,
    PROGRESSIVE_PROCESS_MARKDOWN_CHAR_THRESHOLD,
    SAMPLED_PODCAST_MARKDOWN_CHAR_THRESHOLD,
    SUMMARY_PREFERRED_MARKDOWN_CHAR_THRESHOLD,
    ULTRA_LARGE_DOCUMENT_MARKDOWN_CHAR_THRESHOLD,
    plan_document_processing,
    should_prefer_summary_source,
    should_sample_chunks,
)


class TestDocumentProcessingPath:
    def test_small_document_is_processed_in_one_pass(self):
        plan = plan_document_processing(markdown_length=1_000)
        assert plan.progressive is False
        assert plan.bootstrap_chunk_limit is None

    def test_just_below_progressive_threshold_stays_single_pass(self):
        plan = plan_document_processing(
            markdown_length=PROGRESSIVE_PROCESS_MARKDOWN_CHAR_THRESHOLD - 1
        )
        assert plan.progressive is False

    def test_exactly_at_progressive_threshold_goes_progressive(self):
        # 判断是 >=，正好到达阈值就该切换
        plan = plan_document_processing(
            markdown_length=PROGRESSIVE_PROCESS_MARKDOWN_CHAR_THRESHOLD
        )
        assert plan.progressive is True
        assert plan.bootstrap_chunk_limit == PROGRESSIVE_BOOTSTRAP_CHUNK_LIMIT

    def test_progressive_still_builds_the_graph_below_the_ultra_threshold(self):
        plan = plan_document_processing(
            markdown_length=ULTRA_LARGE_DOCUMENT_MARKDOWN_CHAR_THRESHOLD - 1
        )
        assert plan.progressive is True
        assert plan.auto_graph is True

    def test_ultra_large_document_switches_the_graph_off(self):
        # 严格小于：正好到达超大阈值就该关图谱，这是主动的成本闸门
        plan = plan_document_processing(
            markdown_length=ULTRA_LARGE_DOCUMENT_MARKDOWN_CHAR_THRESHOLD
        )
        assert plan.progressive is True
        assert plan.auto_graph is False

    def test_far_beyond_ultra_threshold_keeps_the_graph_off(self):
        plan = plan_document_processing(
            markdown_length=ULTRA_LARGE_DOCUMENT_MARKDOWN_CHAR_THRESHOLD * 10
        )
        assert plan.auto_graph is False

    def test_empty_document_takes_the_single_pass_path(self):
        plan = plan_document_processing(markdown_length=0)
        assert plan.progressive is False

    def test_plan_is_immutable(self):
        # 计划是一次性决策，不该被下游节点改写
        plan = plan_document_processing(markdown_length=0)
        try:
            plan.progressive = True  # type: ignore[misc]
        except Exception:
            return
        raise AssertionError("DocumentProcessingPlan 应当是 frozen 的")

    def test_thresholds_are_ordered(self):
        # 超大阈值必须高于渐进式阈值，否则"关掉图谱"的分支永远走不到
        assert (
            PROGRESSIVE_PROCESS_MARKDOWN_CHAR_THRESHOLD
            < ULTRA_LARGE_DOCUMENT_MARKDOWN_CHAR_THRESHOLD
        )


class TestPodcastSource:
    def test_short_document_uses_full_text(self):
        assert should_prefer_summary_source(markdown_length=1_000) is False

    def test_just_below_summary_threshold_uses_full_text(self):
        assert (
            should_prefer_summary_source(
                markdown_length=SUMMARY_PREFERRED_MARKDOWN_CHAR_THRESHOLD - 1
            )
            is False
        )

    def test_exactly_at_summary_threshold_prefers_summary(self):
        assert (
            should_prefer_summary_source(
                markdown_length=SUMMARY_PREFERRED_MARKDOWN_CHAR_THRESHOLD
            )
            is True
        )

    def test_sampling_only_kicks_in_far_above_the_summary_threshold(self):
        # 介于两个阈值之间、又没有摘要时，仍然啃全文而不是采样
        between = (
            SUMMARY_PREFERRED_MARKDOWN_CHAR_THRESHOLD
            + SAMPLED_PODCAST_MARKDOWN_CHAR_THRESHOLD
        ) // 2
        assert should_prefer_summary_source(markdown_length=between) is True
        assert should_sample_chunks(markdown_length=between) is False

    def test_exactly_at_sampling_threshold_samples(self):
        assert (
            should_sample_chunks(markdown_length=SAMPLED_PODCAST_MARKDOWN_CHAR_THRESHOLD)
            is True
        )

    def test_thresholds_are_ordered(self):
        # 采样阈值必须高于摘要阈值，否则"先试摘要再采样"的顺序就没有意义
        assert (
            SUMMARY_PREFERRED_MARKDOWN_CHAR_THRESHOLD
            < SAMPLED_PODCAST_MARKDOWN_CHAR_THRESHOLD
        )
