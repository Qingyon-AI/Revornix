import re


_MERMAID_FENCE_RE = re.compile(r"```mermaid[ \t]*\n(.*?)```", re.IGNORECASE | re.DOTALL)
_MERMAID_LINE_BREAK_RE = re.compile(r"<br\s*/?>", re.IGNORECASE)
_MERMAID_HTML_TAG_RE = re.compile(r"</?[A-Za-z][^>\n]*>")
_MERMAID_GRAPH_RE = re.compile(r"^(\s*)graph(\s+(?:TB|TD|BT|RL|LR)\b)", re.IGNORECASE)
_MERMAID_RECT_NODE_RE = re.compile(r'(?P<id>\b[A-Za-z_][\w-]*)\[(?P<label>[^\[\]\n"]+)\]')

_MERMAID_LINE_PREFIX_SKIP = (
    "%%",
    "subgraph ",
    "classDef ",
    "class ",
    "style ",
    "linkStyle ",
    "click ",
    "accTitle:",
    "accDescr:",
    "direction ",
)


def _should_skip_mermaid_line(line: str) -> bool:
    return line == "end" or line.startswith(_MERMAID_LINE_PREFIX_SKIP)


def _normalize_mermaid_label(label: str) -> str:
    cleaned = _MERMAID_LINE_BREAK_RE.sub(" ", label)
    cleaned = _MERMAID_HTML_TAG_RE.sub(" ", cleaned)
    cleaned = cleaned.replace("&nbsp;", " ")
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    cleaned = cleaned.replace("\\", "\\\\").replace('"', '\\"')
    return cleaned


def _replace_rect_node(match: re.Match[str]) -> str:
    node_id = match.group("id")
    label = _normalize_mermaid_label(match.group("label"))
    return f'{node_id}["{label}"]'


def sanitize_mermaid_diagram(diagram: str) -> str:
    normalized = diagram.replace("\r\n", "\n").replace("\r", "\n").strip()
    normalized = _MERMAID_LINE_BREAK_RE.sub(" ", normalized)
    normalized = normalized.replace("&nbsp;", " ")
    normalized = _MERMAID_GRAPH_RE.sub(r"\1flowchart\2", normalized, count=1)

    sanitized_lines: list[str] = []
    for line in normalized.split("\n"):
        stripped = line.lstrip()
        if _should_skip_mermaid_line(stripped):
            sanitized_lines.append(line.rstrip())
            continue
        sanitized_lines.append(_MERMAID_RECT_NODE_RE.sub(_replace_rect_node, line).rstrip())

    return "\n".join(sanitized_lines).strip()


def sanitize_mermaid_blocks(markdown: str) -> str:
    if "```mermaid" not in markdown:
        return markdown

    def _replace_block(match: re.Match[str]) -> str:
        diagram = sanitize_mermaid_diagram(match.group(1))
        return f"```mermaid\n{diagram}\n```"

    return _MERMAID_FENCE_RE.sub(_replace_block, markdown)
