"""转写、播客、PPT 三个工作流里的纯函数。

它们都在做同一件事：把模型或引擎给的原始数据整理成能存、能看的形式。整理错了
**不会抛异常**，只会产出一份格式怪异但合法的东西 —— 时间轴错位的会议纪要、
被截断在句子中间的播客稿、一张解不出来的幻灯片。

这类函数还有个共同特点：输入来自外部（模型输出、引擎返回），所以边界情况不是
假想出来的，是一定会遇到的。
"""

from __future__ import annotations

import base64
import json

import pytest

from base_implement.stt_engine_base import Segment
from workflow import document_podcast_workflow as podcast
from workflow import document_transcribe_workflow as transcribe
from workflow import section_ppt_workflow as ppt


def seg(start: float, speaker: str | None, text: str) -> Segment:
    return Segment(start=start, end=start + 1, speaker=speaker, text=text)


class TestTimestampFormatting:
    @pytest.mark.parametrize(
        "seconds,expected",
        [
            (0, "00:00.000"),
            (1.5, "00:01.500"),
            (59.999, "00:59.999"),
            (60, "01:00.000"),
            (3599, "59:59.000"),
        ],
    )
    def test_under_an_hour_omits_the_hour(self, seconds, expected):
        assert transcribe._format_timestamp(seconds) == expected

    @pytest.mark.parametrize(
        "seconds,expected",
        [(3600, "01:00:00.000"), (3661.25, "01:01:01.250")],
    )
    def test_an_hour_or_more_includes_it(self, seconds, expected):
        # 超过一小时不带小时位，两小时的录音里会出现两个 "05:00"
        assert transcribe._format_timestamp(seconds) == expected

    def test_negative_input_is_clamped(self):
        # 引擎偶尔会给出轻微负的起点。负号会让时间轴看起来是坏的
        assert transcribe._format_timestamp(-5) == "00:00.000"

    def test_milliseconds_are_rounded_not_truncated(self):
        assert transcribe._format_timestamp(1.0006) == "00:01.001"


class TestMeetingMarkdown:
    def test_renders_speaker_and_timestamp(self):
        markdown = transcribe._render_meeting_markdown([seg(0, "S1", "你好")], None)
        assert "**S1**" in markdown
        assert "`00:00.000`" in markdown
        assert "你好" in markdown

    def test_speaker_map_replaces_the_raw_label(self):
        # 没有映射时用户看到的是 "SPEAKER_00" 这种引擎内部标签
        markdown = transcribe._render_meeting_markdown(
            [seg(0, "SPEAKER_00", "你好")], {"SPEAKER_00": "张三"}
        )
        assert "**张三**" in markdown
        assert "SPEAKER_00" not in markdown

    def test_an_unmapped_speaker_keeps_its_raw_label(self):
        markdown = transcribe._render_meeting_markdown(
            [seg(0, "S2", "你好")], {"S1": "张三"}
        )
        assert "**S2**" in markdown

    def test_a_missing_speaker_becomes_unknown(self):
        # 没有说话人信息时留空会让整行变成孤零零的一句话，看不出是谁说的
        markdown = transcribe._render_meeting_markdown([seg(0, None, "你好")], None)
        assert "**Unknown**" in markdown

    def test_segments_keep_their_order(self):
        markdown = transcribe._render_meeting_markdown(
            [seg(0, "S1", "第一句"), seg(5, "S2", "第二句")], None
        )
        assert markdown.index("第一句") < markdown.index("第二句")

    def test_output_ends_with_exactly_one_newline(self):
        markdown = transcribe._render_meeting_markdown([seg(0, "S1", "你好")], None)
        assert markdown.endswith("\n")
        assert not markdown.endswith("\n\n")

    def test_empty_segments_produce_just_a_newline(self):
        assert transcribe._render_meeting_markdown([], None) == "\n"


class TestSerializeSegments:
    def test_round_trips_through_json(self):
        raw = transcribe._serialize_segments([seg(1.5, "S1", "你好")])
        parsed = json.loads(raw)
        assert parsed["segments"][0]["speaker"] == "S1"
        assert parsed["segments"][0]["start"] == 1.5

    def test_non_ascii_is_not_escaped(self):
        # 转义成 \uXXXX 存进库里，人去查数据时完全读不了
        raw = transcribe._serialize_segments([seg(0, "S1", "中文内容")])
        assert "中文内容" in raw


class TestPodcastChunkNormalisation:
    def test_whitespace_is_collapsed(self):
        assert podcast._normalize_podcast_chunk_text("a\n\n  b\tc") == "a b c"

    def test_short_text_is_untouched(self):
        assert podcast._normalize_podcast_chunk_text("短文本") == "短文本"

    def test_long_text_is_truncated_with_an_ellipsis(self):
        limit = podcast.SAMPLED_PODCAST_MAX_CHUNK_TEXT_LENGTH
        result = podcast._normalize_podcast_chunk_text("字" * (limit + 500))
        assert result.endswith("...")
        assert len(result) == limit + 3

    def test_exactly_at_the_limit_is_not_truncated(self):
        # 边界：恰好等于上限不该被加省略号 —— 那是在骗读者说还有下文
        limit = podcast.SAMPLED_PODCAST_MAX_CHUNK_TEXT_LENGTH
        result = podcast._normalize_podcast_chunk_text("字" * limit)
        assert not result.endswith("...")

    def test_empty_text_stays_empty(self):
        assert podcast._normalize_podcast_chunk_text("   \n  ") == ""


class TestCompactMarkdown:
    def test_short_input_is_returned_as_is(self):
        assert ppt._compact_markdown("  正文  ", 100) == "正文"

    def test_long_input_keeps_both_ends(self):
        # 只留开头会让 PPT 完全没有结论部分 —— 而结论往往是最该上幻灯片的
        text = "头" * 500 + "中" * 500 + "尾" * 500
        result = ppt._compact_markdown(text, 200)
        assert result.startswith("头")
        assert result.endswith("尾")
        assert "..." in result

    def test_the_result_respects_the_budget(self):
        text = "字" * 5000
        result = ppt._compact_markdown(text, 300)
        # 省略号那几个字符是额外加的，但整体不该显著超出预算
        assert len(result) <= 300


class TestExtractImagePayload:
    def _data_url(self, subtype: str, raw: bytes) -> str:
        return f"data:image/{subtype};base64,{base64.b64encode(raw).decode()}"

    def test_plain_data_url(self):
        got = ppt._extract_image_payload(self._data_url("png", b"abc"))
        assert got == ("png", b"abc")

    def test_markdown_wrapped_data_url(self):
        # 模型经常把图片包成 markdown 语法返回，而不是给裸的 data URL
        url = self._data_url("png", b"abc")
        got = ppt._extract_image_payload(f"![封面]({url})")
        assert got == ("png", b"abc")

    def test_jpeg_maps_to_the_jpg_extension(self):
        # 存成 .jpeg 不会坏，但和其余文件不一致，日后按扩展名筛会漏
        got = ppt._extract_image_payload(self._data_url("jpeg", b"abc"))
        assert got[0] == "jpg"

    def test_svg_xml_subtype_is_cleaned_up(self):
        got = ppt._extract_image_payload(self._data_url("svg+xml", b"<svg/>"))
        assert got[0] == "svg"

    def test_missing_padding_is_repaired(self):
        # base64 少了 padding 是模型输出里的常见毛病，直接解会抛异常
        payload = base64.b64encode(b"abcde").decode().rstrip("=")
        got = ppt._extract_image_payload(f"data:image/png;base64,{payload}")
        assert got == ("png", b"abcde")

    @pytest.mark.parametrize(
        "text", ["", "不是图片", "https://example.com/a.png", "data:image/png;base64,!!!"]
    )
    def test_unusable_input_returns_none(self, text):
        # 返回 None 而不是抛异常：一张图没生成出来不该让整个 PPT 失败
        assert ppt._extract_image_payload(text) is None


class TestParseThemePrompt:
    def test_new_object_schema_is_joined(self):
        got = ppt._parse_theme_prompt(
            {"theme": {"color_palette": "蓝白", "visual_style": "简约"}}
        )
        assert got == "Colors: 蓝白. Style: 简约"

    def test_partial_object_uses_what_is_there(self):
        assert ppt._parse_theme_prompt({"theme": {"color_palette": "蓝白"}}) == "Colors: 蓝白"

    def test_empty_object_yields_none(self):
        assert ppt._parse_theme_prompt({"theme": {}}) is None

    def test_legacy_string_field_still_works(self):
        # 旧 schema 还在库里存着，读不了就等于历史数据全废
        assert ppt._parse_theme_prompt({"theme_prompt": "老字段"}) == "老字段"

    def test_nothing_at_all_yields_none(self):
        assert ppt._parse_theme_prompt({}) is None


class TestParseSlidePlan:
    def test_new_schema_fields(self):
        plan = ppt._parse_slide_plan(
            {
                "id": "s1",
                "title": "标题",
                "image_prompt": "  画一张图  ",
                "speaker_notes": "备注",
                "type": "cover",
                "key_points": ["一", "二"],
            }
        )
        assert plan.id == "s1"
        assert plan.prompt == "画一张图"
        assert plan.summary == "备注"
        assert plan.slide_type == "cover"
        assert plan.key_points == ["一", "二"]

    def test_legacy_keys_are_accepted(self):
        plan = ppt._parse_slide_plan(
            {"prompt": "老提示词", "summary": "老摘要", "slide_type": "content"}
        )
        assert plan.prompt == "老提示词"
        assert plan.summary == "老摘要"
        assert plan.slide_type == "content"

    def test_new_keys_win_over_legacy(self):
        plan = ppt._parse_slide_plan({"image_prompt": "新", "prompt": "老"})
        assert plan.prompt == "新"

    def test_missing_fields_get_safe_defaults(self):
        # 模型少给一个字段就抛 KeyError 的话，整份 PPT 会因为一张幻灯片而失败
        plan = ppt._parse_slide_plan({})
        assert plan.id == ""
        assert plan.title == ""
        assert plan.prompt == ""
        assert plan.key_points == []
        assert plan.speaker_notes is None
