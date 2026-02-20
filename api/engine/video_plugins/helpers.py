import html
import re

from .base import SubtitleSegment


def normalize_subtitle_text(text: str) -> str:
    normalized = html.unescape(text)
    normalized = normalized.replace("\n", " ").replace("\r", " ")
    normalized = normalized.replace("\u200b", "").replace("\xa0", " ")
    normalized = re.sub(r"\s+", " ", normalized)
    return normalized.strip()


def format_seconds(total_seconds: float) -> str:
    seconds = max(0, int(total_seconds))
    hours, remainder = divmod(seconds, 3600)
    minutes, secs = divmod(remainder, 60)
    if hours > 0:
        return f"{hours:02d}:{minutes:02d}:{secs:02d}"
    return f"{minutes:02d}:{secs:02d}"


def build_timeline_markdown(
    platform: str,
    language: str | None,
    segments: list[SubtitleSegment],
    max_segments: int,
    max_chars: int,
) -> str | None:
    if not segments:
        return None

    lines = [
        "## Video Subtitle Transcript",
        "",
        f"- Platform: {platform}",
        f"- Language: {language or 'unknown'}",
        f"- Segment Count: {len(segments)}",
        "",
    ]

    used_chars = 0
    appended_segments = 0
    truncated = False

    for segment in segments:
        if appended_segments >= max_segments:
            truncated = True
            break

        line = f"[{format_seconds(segment.start_seconds)}] {segment.text}"
        if used_chars + len(line) > max_chars:
            truncated = True
            break

        lines.append(line)
        used_chars += len(line)
        appended_segments += 1

    if truncated:
        lines.append("")
        lines.append(f"> Transcript truncated to {appended_segments} segments for performance.")

    return "\n".join(lines)


def build_plain_markdown(
    platform: str,
    language: str | None,
    lines: list[str],
    max_segments: int,
    max_chars: int,
) -> str | None:
    normalized_lines: list[str] = []
    seen: set[str] = set()
    for line in lines:
        normalized = normalize_subtitle_text(line)
        if not normalized or normalized in seen:
            continue
        seen.add(normalized)
        normalized_lines.append(normalized)

    if not normalized_lines:
        return None

    markdown_lines = [
        "## Video Subtitle Transcript",
        "",
        f"- Platform: {platform}",
        f"- Language: {language or 'unknown'}",
        f"- Segment Count: {len(normalized_lines)}",
        "",
    ]

    used_chars = 0
    appended = 0
    truncated = False
    for line in normalized_lines:
        if appended >= max_segments:
            truncated = True
            break
        if used_chars + len(line) > max_chars:
            truncated = True
            break
        markdown_lines.append(line)
        used_chars += len(line)
        appended += 1

    if truncated:
        markdown_lines.append("")
        markdown_lines.append(f"> Transcript truncated to {appended} segments for performance.")

    return "\n".join(markdown_lines)