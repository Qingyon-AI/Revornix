from data.custom_types.all import EntityInfo, RelationInfo
from enums.user import AIInteractionLanguage


def _get_section_heading_spec(language: int | None) -> tuple[list[str], str]:
    if language == AIInteractionLanguage.CHINESE:
        headings = [
            "导语",
            "核心观点",
            "主题展开",
            "关联脉络",
            "结语",
        ]
        instruction = (
            "Use Simplified Chinese section headings. "
            "The required headings are exactly: "
            + ", ".join(f"`{heading}`" for heading in headings)
            + "."
        )
        return headings, instruction

    if language == AIInteractionLanguage.ENGLISH:
        headings = [
            "Introduction",
            "Core Arguments",
            "Deep Dive",
            "Connections & Patterns",
            "Closing Thoughts",
        ]
        instruction = (
            "Use English section headings. "
            "The required headings are exactly: "
            + ", ".join(f"`{heading}`" for heading in headings)
            + "."
        )
        return headings, instruction

    headings = [
        "Introduction / 导语",
        "Core Arguments / 核心观点",
        "Deep Dive / 主题展开",
        "Connections & Patterns / 关联脉络",
        "Closing Thoughts / 结语",
    ]
    instruction = (
        "Choose section headings in the same dominant language as the output. "
        "If the output is Chinese, use `导语`, `核心观点`, `主题展开`, "
        "`关联脉络`, `结语`. If the output is English, use "
        "`Introduction`, `Core Arguments`, `Deep Dive`, "
        "`Connections & Patterns`, `Closing Thoughts`."
    )
    return headings, instruction


def make_section_markdown_prompt(
    current_markdown_content: str | None,
    new_markdown_contents_to_append: str,
    entities: list[EntityInfo],
    relations: list[RelationInfo],
    language: int | None,
):
    section_headings, heading_instruction = _get_section_heading_spec(language)
    entities_lines = "\n".join(
        f"| {e.id} | {e.text} | {e.entity_type} | {', '.join(map(str, e.chunks))} |"
        for e in entities
    )
    entities_table = (
        "| ID | Text | Type | Chunks |\n"
        "|----|------|------|--------|\n"
        f"{entities_lines}"
        if entities
        else "_No entities detected._"
    )

    relations_lines = "\n".join(
        f"- **{r.src_node}** — *{r.relation_type}* → **{r.tgt_node}**"
        for r in relations
    )
    relations_block = relations_lines if relations else "_No relations detected._"

    current_md = current_markdown_content or "_No existing section content._"

    return f"""
You are a senior column editor for a high-signal knowledge publishing platform.

Your task is to turn the source material into a publication-ready Markdown column:
clear thesis, strong structure, smooth transitions, and real informational density.
This is not a generic summary report and not a meeting note. It should read like a well-written long-form column.

---

# Current Section Content (for context alignment)
{current_md}

---

# New Content to Integrate and Analyze
{new_markdown_contents_to_append}

---

# Knowledge Graph — Entities
Use these entities to identify key concepts, themes, actors, and domain-specific elements.

{entities_table}

---

# Knowledge Graph — Relations
Use these relations to establish logical structure, semantic dependencies, contrast, evolution, and causality where supported.

{relations_block}

---

# Your Output Task
You must generate a refined Markdown column following these rules:

## 1. Required Shape
Your output must start with:

- A strong H1 title that is specific, concrete, and publication-worthy
- A 1-2 paragraph opening that immediately frames the topic, tension, or key question

After that, organize the article using the following section roles:

1. **{section_headings[0]}**
2. **{section_headings[1]}**
3. **{section_headings[2]}**
4. **{section_headings[3]}**
5. **{section_headings[4]}**

{heading_instruction}

Interpret these as editorial roles, not as rigid report boilerplate:
- `{section_headings[0]}` should orient the reader and establish why the topic matters
- `{section_headings[1]}` should extract the 2-4 most important claims or takeaways
- `{section_headings[2]}` should do the real analytical work with evidence and explanation
- `{section_headings[3]}` should connect entities, themes, actors, causes, consequences, or patterns
- `{section_headings[4]}` should close crisply with implications, judgment, or what to watch next

## 2. Output Style
- Prefer sharp synthesis and argument over exhaustive enumeration
- Reuse and improve existing structure when possible instead of flattening everything into a rewrite
- Write like an editor: vary paragraph length, use transitions, and keep a clear narrative line
- Bullets are allowed, but only where they improve scanability; the article should still feel like prose-first writing
- Avoid turning every section into a list of points with identical cadence
- Use tables only when they genuinely compress comparisons or categories
- Include at most one Mermaid diagram, and only when it materially clarifies a relationship that prose alone handles poorly
- If you include Mermaid, keep it compatible with strict Mermaid rendering:
  use `flowchart TD` or `flowchart LR`
- Use node syntax like `ID["Short label"]`
- Keep node labels short and plain-text only
- Do not use HTML tags such as `<br/>` or `<br>`
- Do not put Markdown formatting inside Mermaid labels
- Replace label line breaks with spaces instead of HTML
- Avoid raw double quotes inside labels; simplify or rephrase if needed
- If a diagram would require complex or fragile Mermaid syntax, omit the diagram instead

## 3. Writing Requirements
- The content must be strictly grounded in the provided material
  (no hallucination or invented facts)
- Rewrite, reorganize, and upgrade clarity while keeping the meaning accurate
- Use a professional editorial tone: precise, readable, and opinionated only when the source justifies it
- Prioritize insight over taxonomy; explain why something matters, not just what exists
- Do not produce empty headings, filler transitions, or consultant-style boilerplate
- Avoid generic framing such as "this article discusses", "from the above content", "in today's rapidly evolving landscape"
- Prefer concrete nouns, concrete verbs, and explicit causal or thematic links
- Surface tension, tradeoffs, shifts, contradictions, dependencies, and implications where supported by the source
- If "Current Section Content" exists, treat it as baseline context that must be preserved;
  do not drop existing analyses, only refine, merge, and extend them with the new content
- "Current Section Content" may contain helper blocks such as
  "Context Memory", "Section Head Snapshot", or "Section Tail Snapshot";
  treat them as references only and DO NOT output these helper headings verbatim
- When multiple documents overlap, deduplicate them aggressively and merge them into a cleaner through-line
- When the material is thin, keep the article tight rather than padding it out
- When the material is rich, build hierarchy and progression instead of piling on details
- Avoid verbose filler, decorative language, and redundant examples
- Output pure Markdown only, with no additional explanations

## 4. Quality Bar
Before you answer, check your draft against this bar:
- Would a reader feel this is an actual column rather than an AI summary?
- Does each section add a distinct layer of value?
- Is the opening strong enough to make the reader continue?
- Are the middle sections organized around ideas rather than source order?
- Does the ending leave the reader with a clear judgment, implication, or direction?

Please output the final Markdown column now.
"""
