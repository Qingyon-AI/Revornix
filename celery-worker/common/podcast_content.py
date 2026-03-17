import re


PODCAST_FULL_MARKDOWN_MAX_CHARS = 8_000
PODCAST_MEDIUM_MARKDOWN_MAX_CHARS = 24_000
PODCAST_LONG_MARKDOWN_MAX_CHARS = 80_000
PODCAST_MEDIUM_COMPACT_MAX_CHARS = 7_000
PODCAST_LONG_COMPACT_MAX_CHARS = 5_500
PODCAST_XLONG_COMPACT_MAX_CHARS = 4_500

_MARKDOWN_IMAGE_RE = re.compile(r"!\[[^\]]*]\([^)]+\)")
_MARKDOWN_LINK_RE = re.compile(r"\[([^\]]+)]\(([^)]+)\)")
_HTML_IMAGE_RE = re.compile(r"<img\b[^>]*>", re.IGNORECASE)
_HTML_COMMENT_RE = re.compile(r"<!--.*?-->", re.DOTALL)
_DATA_IMAGE_RE = re.compile(r"data:image/[^)\s]+", re.IGNORECASE)
_MERMAID_BLOCK_RE = re.compile(r"```mermaid[\s\S]*?```", re.IGNORECASE)
_FENCED_CODE_BLOCK_RE = re.compile(r"```[\s\S]*?```")


def _strip_markdown_noise(markdown: str) -> str:
    content = markdown.replace("\r\n", "\n").replace("\r", "\n")
    content = _HTML_COMMENT_RE.sub("\n", content)
    content = _MERMAID_BLOCK_RE.sub("\n", content)
    content = _FENCED_CODE_BLOCK_RE.sub("\n", content)
    content = _HTML_IMAGE_RE.sub("\n", content)
    content = _MARKDOWN_IMAGE_RE.sub("\n", content)
    content = _DATA_IMAGE_RE.sub("", content)
    content = _MARKDOWN_LINK_RE.sub(r"\1", content)
    content = re.sub(r"\n{3,}", "\n\n", content)
    content = re.sub(r"[ \t]{2,}", " ", content)
    return content.strip()


def _build_markdown_memory(
    *,
    markdown: str,
    max_chars: int,
) -> str:
    lines = markdown.splitlines()
    memory_lines: list[str] = []
    idx = 0

    while idx < len(lines):
        line = lines[idx].strip()
        idx += 1
        if not line.startswith("#"):
            continue

        snippet = ""
        probe = idx
        while probe < len(lines):
            candidate = lines[probe].strip()
            probe += 1
            if not candidate:
                continue
            if candidate.startswith("#"):
                break
            snippet = candidate
            break

        if len(snippet) > 140:
            snippet = snippet[:137] + "..."
        memory_lines.append(f"- {line}{f' :: {snippet}' if snippet else ''}")

        candidate_memory = "\n".join(memory_lines)
        if len(candidate_memory) >= max_chars:
            break

    if not memory_lines:
        paragraphs = [p.strip() for p in markdown.split("\n\n") if p.strip()]
        fallback_parts: list[str] = []
        if paragraphs:
            fallback_parts.append(f"- First: {paragraphs[0][:180]}")
        if len(paragraphs) > 1:
            fallback_parts.append(f"- Last: {paragraphs[-1][:180]}")
        memory_lines = fallback_parts

    memory = "\n".join(memory_lines).strip()
    if len(memory) > max_chars:
        memory = memory[: max_chars - 3].rstrip() + "..."
    return memory


def _compact_markdown_for_podcast(
    *,
    markdown: str,
    max_chars: int,
) -> str:
    if len(markdown) <= max_chars:
        return markdown

    head_limit = min(2200, max_chars // 3)
    memory_limit = min(1800, max_chars // 3)
    tail_limit = max(max_chars - head_limit - memory_limit - 64, max_chars // 4)

    head = markdown[:head_limit].strip()
    tail = markdown[-tail_limit:].strip()
    memory = _build_markdown_memory(
        markdown=markdown,
        max_chars=memory_limit,
    ).strip()

    compact = (
        "## Structure Memory\n"
        f"{memory}\n\n"
        "## Head Snapshot\n"
        f"{head}\n\n"
        "## Tail Snapshot\n"
        f"{tail}"
    ).strip()
    if len(compact) <= max_chars:
        return compact
    return compact[: max_chars - 3].rstrip() + "..."


def prepare_podcast_markdown(
    *,
    markdown: str,
    title: str | None = None,
    description: str | None = None,
) -> tuple[str, str]:
    cleaned_markdown = _strip_markdown_noise(markdown)
    metadata_parts = [
        part.strip()
        for part in [title, description]
        if isinstance(part, str) and part.strip()
    ]
    normalized_markdown = (
        "\n\n".join(metadata_parts + [cleaned_markdown]).strip()
        if metadata_parts
        else cleaned_markdown
    )

    if len(normalized_markdown) <= PODCAST_FULL_MARKDOWN_MAX_CHARS:
        return normalized_markdown, "full"
    if len(normalized_markdown) <= PODCAST_MEDIUM_MARKDOWN_MAX_CHARS:
        return (
            _compact_markdown_for_podcast(
                markdown=normalized_markdown,
                max_chars=PODCAST_MEDIUM_COMPACT_MAX_CHARS,
            ),
            "medium",
        )
    if len(normalized_markdown) <= PODCAST_LONG_MARKDOWN_MAX_CHARS:
        return (
            _compact_markdown_for_podcast(
                markdown=normalized_markdown,
                max_chars=PODCAST_LONG_COMPACT_MAX_CHARS,
            ),
            "long",
        )
    return (
        _compact_markdown_for_podcast(
            markdown=normalized_markdown,
            max_chars=PODCAST_XLONG_COMPACT_MAX_CHARS,
        ),
        "xlong",
    )
