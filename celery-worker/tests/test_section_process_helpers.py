"""专栏生成工作流里的纯逻辑。

`section_process_workflow.py` 是仓库里最长的一个文件（1,732 行），而它做的事对
用户最可见：把一批文档揉成一篇专栏正文。这里挑的都是**错了不报错**的部分：

- 分批切分丢字 → 专栏少了某份文档的一段，正文读起来仍然通顺；
- 图片占位符替换错 → 同一张图重复出现，或者留下一个裸的 `[image-id: x]`；
- 出图门槛判错 → 要么给一篇两句话的专栏配四张插图，要么该配图的一篇一张没有；
- token 超限没被识别 → 本可以拆小重试的请求直接判失败。

其中分批那条最要紧，所以用**内容守恒**来验：切出来的所有批次拼起来，必须包含
原文的每一个非空白字符。
"""

from __future__ import annotations

import re

import pytest

from workflow import section_process_workflow as node

MAX_CHARS = node.SECTION_MARKDOWN_BATCH_CHAR_LIMIT


def squeeze(text: str) -> str:
    """去掉所有空白，只留内容 —— 切分允许调整空白，不允许丢字。"""
    return re.sub(r"\s+", "", text)


class TestMarkdownBatching:
    def test_short_documents_share_one_batch(self):
        batches = node._build_markdown_batches(["甲", "乙"], max_batch_chars=MAX_CHARS)
        assert len(batches) == 1
        assert "甲" in batches[0] and "乙" in batches[0]

    def test_empty_documents_are_dropped(self):
        batches = node._build_markdown_batches(["", "   \n ", "有内容"], max_batch_chars=MAX_CHARS)
        assert len(batches) == 1
        assert squeeze(batches[0]) == "有内容"

    def test_nothing_at_all_yields_no_batches(self):
        assert len(node._build_markdown_batches([], max_batch_chars=MAX_CHARS)) == 0
        assert len(node._build_markdown_batches(["", " "], max_batch_chars=MAX_CHARS)) == 0

    def test_a_long_document_is_split(self):
        batches = node._build_markdown_batches(
            ["字" * (MAX_CHARS * 3)], max_batch_chars=MAX_CHARS
        )
        assert len(batches) >= 3

    @pytest.mark.parametrize("limit", [4_000, MAX_CHARS])
    def test_no_batch_exceeds_the_limit(self, limit):
        # 超了就等于白切：下游那次模型调用照样会因 token 超限失败
        docs = ["段落。\n\n" * 900, "另一份文档\n" * 700]
        for batch in node._build_markdown_batches(docs, max_batch_chars=limit):
            assert len(batch) <= limit

    @pytest.mark.parametrize(
        "docs",
        [
            ["字" * 30_000],
            ["甲" * 15_000, "乙" * 15_000],
            ["短", "字" * 40_000, "也短"],
            ["段落一。\n\n段落二。\n\n" * 2_000],
        ],
    )
    def test_no_content_is_lost(self, docs):
        """内容守恒 —— 这条不变量抓的是「专栏少了一段」这类无声的错误。"""
        batches = node._build_markdown_batches(docs, max_batch_chars=MAX_CHARS)
        joined = squeeze("".join(batches))
        assert joined == squeeze("".join(docs))

    def test_content_order_is_preserved(self):
        docs = ["第一份" + "甲" * 20_000, "第二份" + "乙" * 20_000]
        joined = "".join(node._build_markdown_batches(docs, max_batch_chars=MAX_CHARS))
        assert joined.index("第一份") < joined.index("第二份")

    def test_splitting_prefers_paragraph_boundaries(self):
        # 从段落中间切开会让模型看到半句话，生成的正文跟着断裂
        head = "甲" * 5_000
        tail = "乙" * 5_000
        batches = node._build_markdown_batches(
            [f"{head}\n\n{tail}"], max_batch_chars=6_000
        )
        assert batches[0].strip() == head


class TestSplitNearMiddle:
    def test_splits_into_two_non_empty_halves(self):
        left, right = node._split_text_near_middle("甲" * 100 + "\n\n" + "乙" * 100)
        assert left and right

    def test_nothing_is_lost(self):
        text = "甲" * 5_000 + "\n\n" + "乙" * 5_000
        left, right = node._split_text_near_middle(text)
        assert squeeze(left + right) == squeeze(text)

    def test_a_single_character_cannot_be_split(self):
        # 递归拆分的终止条件。返回两个非空会让上层无限拆下去
        assert node._split_text_near_middle("甲") == ("甲", "")

    def test_text_without_newlines_still_splits(self):
        # 没有换行可依时退回到中点。返回原文不切会让重试永远超限
        left, right = node._split_text_near_middle("甲" * 1_000)
        assert left and right


class TestSplitSummarySentences:
    def test_splits_on_chinese_punctuation(self):
        got = node._split_summary_sentences("第一句。第二句！第三句？", max_items=10)
        assert got == ["第一句。", "第二句！", "第三句？"]

    def test_respects_the_cap(self):
        got = node._split_summary_sentences("一。二。三。四。", max_items=2)
        assert got == ["一。", "二。"]

    def test_text_without_punctuation_is_one_item(self):
        # 整段没有标点时返回空列表会让摘要凭空消失
        assert node._split_summary_sentences("没有标点的一整段", max_items=5) == [
            "没有标点的一整段"
        ]

    def test_whitespace_is_normalised(self):
        assert node._split_summary_sentences("一句话  \n  还在同一句", max_items=5) == [
            "一句话 还在同一句"
        ]

    @pytest.mark.parametrize("text", ["", "   ", None])
    def test_empty_input_yields_nothing(self, text):
        assert node._split_summary_sentences(text, max_items=5) == []


class TestImagePlaceholderSubstitution:
    def test_a_marker_is_replaced_by_its_image(self):
        images = [node.GeneratedImage(id="a", prompt="p", image="![图](http://x/a.png)")]
        got = node.apply_generated_images(
            section_id=1, markdown_with_markers="前[image-id: a]后", images=images
        )
        assert "![图](http://x/a.png)" in got
        assert "[image-id" not in got

    def test_a_bare_data_url_gets_wrapped_as_markdown(self):
        # 不包成 markdown 的话，正文里会出现一长串 base64 明文
        images = [node.GeneratedImage(id="a", prompt="p", image="data:image/png;base64,AAA")]
        got = node.apply_generated_images(
            section_id=1, markdown_with_markers="[image-id: a]", images=images
        )
        assert got.strip().startswith("![image](data:image/png;base64,AAA)")

    def test_a_repeated_marker_is_not_inserted_twice(self):
        # 同一张图连着出现两次，读起来像是排版出错
        images = [node.GeneratedImage(id="a", prompt="p", image="![图](http://x/a.png)")]
        got = node.apply_generated_images(
            section_id=1,
            markdown_with_markers="[image-id: a] 中间 [image-id: a]",
            images=images,
        )
        assert got.count("http://x/a.png") == 1
        assert "image reused" in got

    def test_a_missing_image_leaves_a_visible_failure_note(self):
        # 关键：不能把标记原样留在正文里 —— 用户会看到 `[image-id: a]` 这种内部记号
        got = node.apply_generated_images(
            section_id=1, markdown_with_markers="[image-id: a]", images=[]
        )
        assert "[image-id" not in got

    def test_markdown_without_markers_is_untouched(self):
        text = "一段没有图片标记的正文"
        assert node.apply_generated_images(
            section_id=1, markdown_with_markers=text, images=[]
        ) == text

    def test_marker_ids_are_trimmed(self):
        # 模型写出来的标记里空格位置不固定
        images = [node.GeneratedImage(id="a", prompt="p", image="![图](http://x/a.png)")]
        got = node.apply_generated_images(
            section_id=1, markdown_with_markers="[image-id:   a  ]", images=images
        )
        assert "http://x/a.png" in got


class TestShouldGenerateImages:
    def _call(self, **overrides):
        kwargs = {
            "content": "字" * 10_000,
            "target_document_count": 5,
            "entity_count": 100,
            "relation_count": 100,
        }
        kwargs.update(overrides)
        return node._should_generate_section_images(**kwargs)

    def test_a_rich_section_is_eligible(self):
        ok, reason = self._call()
        assert ok is True
        assert reason == "eligible"

    def test_too_short_is_rejected_with_a_reason(self):
        # 理由字符串会进埋点。只返回 False 的话，线上想知道"为什么没配图"就只能猜
        ok, reason = self._call(content="太短")
        assert ok is False
        assert reason.startswith("content_too_short")

    def test_too_few_entities_is_rejected(self):
        ok, reason = self._call(entity_count=0)
        assert ok is False
        assert reason.startswith("entity_count_too_low")

    def test_too_few_relations_is_rejected(self):
        ok, reason = self._call(relation_count=0)
        assert ok is False
        assert reason.startswith("relation_count_too_low")

    def test_a_single_document_section_uses_stricter_thresholds(self):
        # 方向容易记反：单文档专栏门槛更**严**（实体 10 vs 6、关系 6 vs 4、
        # 正文 3000 vs 2000 字）。因为一份文档能综合出的东西本就有限，
        # 要更多实质内容才值得配图 —— 否则就是给一篇流水账硬塞插图。
        multi = self._call(target_document_count=5, entity_count=7, relation_count=5)
        single = self._call(target_document_count=1, entity_count=7, relation_count=5)
        assert multi[0] is True
        assert single[0] is False
        assert single[1].startswith("entity_count_too_low")

    def test_the_single_document_content_threshold_is_higher_too(self):
        content = "字" * 2_500  # 多文档够，单文档不够
        assert self._call(target_document_count=5, content=content)[0] is True
        assert self._call(target_document_count=1, content=content)[0] is False


class TestTokenLimitDetection:
    @pytest.mark.parametrize(
        "message",
        [
            "This model's maximum context length is 8192 tokens",
            "Exceeded model token limit",
            "context_length_exceeded",
            "CONTEXT_LENGTH_EXCEEDED",
        ],
    )
    def test_recognised_forms(self, message):
        # 认不出来就不会拆小重试，一份大专栏直接判失败
        assert node._is_token_limit_error(Exception(message)) is True

    @pytest.mark.parametrize("message", ["connection reset", "rate limit exceeded", ""])
    def test_other_errors_are_not_token_limits(self, message):
        # 反过来误判也有代价：网络错误被当成超限，会白拆一遍再失败
        assert node._is_token_limit_error(Exception(message)) is False


class TestDocumentWrapping:
    def test_wraps_with_source_metadata(self):
        got = node._wrap_document_markdown_for_section(
            document_id=7,
            document_title="标题",
            document_category=node.DocumentCategory.FILE,
            markdown_content="正文",
        )
        assert "document_id=7" in got
        assert "标题" in got
        assert "正文" in got

    def test_an_empty_document_produces_nothing(self):
        # 返回一个只有头部没有正文的块，等于给模型喂一份空文档
        got = node._wrap_document_markdown_for_section(
            document_id=7,
            document_title="标题",
            document_category=node.DocumentCategory.FILE,
            markdown_content="   \n  ",
        )
        assert got == ""

    def test_a_missing_title_falls_back_to_the_id(self):
        got = node._wrap_document_markdown_for_section(
            document_id=7,
            document_title=None,
            document_category=node.DocumentCategory.FILE,
            markdown_content="正文",
        )
        assert "Document 7" in got

    @pytest.mark.parametrize(
        "category,label",
        [
            (node.DocumentCategory.FILE, "File"),
            (node.DocumentCategory.WEBSITE, "Website"),
            (node.DocumentCategory.QUICK_NOTE, "Quick Note"),
            (node.DocumentCategory.AUDIO, "Audio Transcript"),
        ],
    )
    def test_category_labels(self, category, label):
        assert node._format_document_category_label(category) == label

    def test_an_unknown_category_is_still_readable(self):
        # 新增一个类型忘了加分支时，输出应当能看出是哪个值，而不是崩掉
        assert node._format_document_category_label(999) == "DocumentCategory(999)"


class TestCjkDetection:
    @pytest.mark.parametrize("text", ["中文", "mixed 中文 text"])
    def test_detects_chinese(self, text):
        assert node._contains_cjk(text) is True

    @pytest.mark.parametrize("text", ["plain english", "", None, "123 !@#"])
    def test_no_false_positives(self, text):
        # 判成中文会让整篇专栏的小标题变成中文，而正文是英文
        assert node._contains_cjk(text) is False
