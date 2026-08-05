"""播客输入的分级压缩。

`prepare_podcast_markdown` 决定一份文档以什么形态喂给 TTS：短的原样送，长的按
三档逐级压缩。判断错档不会报错，只会让 LLM 拿到超出预期的输入 —— 表现为播客内容
被截断或成本飙升，而不是一个能定位的失败。所以这里测的是**档位边界**本身。
"""

from __future__ import annotations

from common.podcast_content import (
    PODCAST_FULL_MARKDOWN_MAX_CHARS,
    PODCAST_LONG_COMPACT_MAX_CHARS,
    PODCAST_LONG_MARKDOWN_MAX_CHARS,
    PODCAST_MEDIUM_COMPACT_MAX_CHARS,
    PODCAST_MEDIUM_MARKDOWN_MAX_CHARS,
    PODCAST_XLONG_COMPACT_MAX_CHARS,
    prepare_podcast_markdown,
)


def _markdown_of(length: int) -> str:
    # 用不会被清洗规则改动的纯文本，让长度可控
    return "a" * length


class TestTierBoundaries:
    def test_short_content_passes_through_as_full(self):
        text, tier = prepare_podcast_markdown(markdown="很短的一段内容")
        assert tier == "full"
        assert text == "很短的一段内容"

    def test_exactly_at_full_limit_is_still_full(self):
        # 边界是 <=，等于上限不该掉档
        _, tier = prepare_podcast_markdown(
            markdown=_markdown_of(PODCAST_FULL_MARKDOWN_MAX_CHARS)
        )
        assert tier == "full"

    def test_one_over_full_limit_drops_to_medium(self):
        _, tier = prepare_podcast_markdown(
            markdown=_markdown_of(PODCAST_FULL_MARKDOWN_MAX_CHARS + 1)
        )
        assert tier == "medium"

    def test_exactly_at_medium_limit_is_still_medium(self):
        _, tier = prepare_podcast_markdown(
            markdown=_markdown_of(PODCAST_MEDIUM_MARKDOWN_MAX_CHARS)
        )
        assert tier == "medium"

    def test_one_over_medium_limit_drops_to_long(self):
        _, tier = prepare_podcast_markdown(
            markdown=_markdown_of(PODCAST_MEDIUM_MARKDOWN_MAX_CHARS + 1)
        )
        assert tier == "long"

    def test_beyond_long_limit_drops_to_xlong(self):
        _, tier = prepare_podcast_markdown(
            markdown=_markdown_of(PODCAST_LONG_MARKDOWN_MAX_CHARS + 1)
        )
        assert tier == "xlong"


class TestCompaction:
    """压缩档必须真的把长度压到该档的上限之内 —— 否则分档就没有意义。"""

    def test_medium_output_respects_its_budget(self):
        text, tier = prepare_podcast_markdown(
            markdown=_markdown_of(PODCAST_FULL_MARKDOWN_MAX_CHARS + 100)
        )
        assert tier == "medium"
        assert len(text) <= PODCAST_MEDIUM_COMPACT_MAX_CHARS

    def test_long_output_respects_its_budget(self):
        text, tier = prepare_podcast_markdown(
            markdown=_markdown_of(PODCAST_MEDIUM_MARKDOWN_MAX_CHARS + 100)
        )
        assert tier == "long"
        assert len(text) <= PODCAST_LONG_COMPACT_MAX_CHARS

    def test_xlong_output_respects_its_budget(self):
        text, tier = prepare_podcast_markdown(
            markdown=_markdown_of(PODCAST_LONG_MARKDOWN_MAX_CHARS + 100)
        )
        assert tier == "xlong"
        assert len(text) <= PODCAST_XLONG_COMPACT_MAX_CHARS

    def test_longer_input_never_yields_looser_budget(self):
        # 档位越高预算越紧，这个单调性是分级压缩的前提
        assert PODCAST_XLONG_COMPACT_MAX_CHARS <= PODCAST_LONG_COMPACT_MAX_CHARS
        assert PODCAST_LONG_COMPACT_MAX_CHARS <= PODCAST_MEDIUM_COMPACT_MAX_CHARS


class TestMetadata:
    def test_title_and_description_are_prepended(self):
        text, _ = prepare_podcast_markdown(
            markdown="正文", title="标题", description="摘要"
        )
        assert text.index("标题") < text.index("摘要") < text.index("正文")

    def test_blank_metadata_is_ignored(self):
        text, _ = prepare_podcast_markdown(markdown="正文", title="   ", description=None)
        assert text == "正文"

    def test_metadata_counts_toward_the_tier_budget(self):
        # 标题/摘要拼进去之后才判断档位，否则刚好卡线的文档会被判错档
        long_title = "标" * (PODCAST_FULL_MARKDOWN_MAX_CHARS + 10)
        _, tier = prepare_podcast_markdown(markdown="正文", title=long_title)
        assert tier != "full"


class TestNoiseStripping:
    def test_images_are_removed(self):
        text, _ = prepare_podcast_markdown(markdown="前 ![alt](http://x/y.png) 后")
        assert "http://x/y.png" not in text
        assert "前" in text and "后" in text

    def test_links_keep_their_text_but_drop_urls(self):
        # 念出一串 URL 对听众毫无意义，但链接文字是内容的一部分
        text, _ = prepare_podcast_markdown(markdown="见 [官方文档](https://example.com/docs)")
        assert "https://example.com/docs" not in text
        assert "官方文档" in text

    def test_html_comments_are_removed(self):
        text, _ = prepare_podcast_markdown(markdown="正文 <!-- 内部备注 --> 结尾")
        assert "内部备注" not in text
