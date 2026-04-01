from data.custom_types.all import EntityInfo, RelationInfo
from enums.user import AIInteractionLanguage


def _get_section_heading_spec(language: int | None) -> tuple[list[str], str]:
    if language == AIInteractionLanguage.CHINESE:
        headings = [
            "执行摘要",
            "关键洞察",
            "详细分析",
            "知识图谱解读",
            "结论与建议",
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
            "Executive Summary",
            "Key Insights",
            "Detailed Analysis",
            "Knowledge Graph Interpretation",
            "Conclusion & Recommendations",
        ]
        instruction = (
            "Use English section headings. "
            "The required headings are exactly: "
            + ", ".join(f"`{heading}`" for heading in headings)
            + "."
        )
        return headings, instruction

    headings = [
        "Executive Summary / 执行摘要",
        "Key Insights / 关键洞察",
        "Detailed Analysis / 详细分析",
        "Knowledge Graph Interpretation / 知识图谱解读",
        "Conclusion & Recommendations / 结论与建议",
    ]
    instruction = (
        "Choose section headings in the same dominant language as the output. "
        "If the output is Chinese, use `执行摘要`, `关键洞察`, `详细分析`, "
        "`知识图谱解读`, `结论与建议`. If the output is English, use "
        "`Executive Summary`, `Key Insights`, `Detailed Analysis`, "
        "`Knowledge Graph Interpretation`, `Conclusion & Recommendations`."
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
    # ---- Entity Table ----
    entities_lines = "\n".join(
        f"| {e.id} | {e.text} | {e.entity_type} | {', '.join(map(str, e.chunks))} |"
        for e in entities
    )
    entities_table = (
        "| ID | Text | Type | Chunks |\n"
        "|----|------|------|--------|\n"
        f"{entities_lines}"
        if entities else "_No entities detected._"
    )

    # ---- Relations ----
    relations_lines = "\n".join(
        f"- **{r.src_node}** — *{r.relation_type}* → **{r.tgt_node}**"
        for r in relations
    )
    relations_block = relations_lines if relations else "_No relations detected._"

    # ---- Existing Content ----
    current_md = current_markdown_content or "_No existing section content._"
    
    prompt = f"""
You are a professional technical writer and information architect.

Your task is to produce a clear, concise, well-structured Markdown report based on the following inputs.

---

# 📌 Current Section Content (for context alignment)
{current_md}

---

# ➕ New Content to Integrate and Analyze
{new_markdown_contents_to_append}

---

# 🧠 Knowledge Graph — Entities
Use these entities to identify key concepts, themes, and domain-specific elements.

{entities_table}

---

# 🔗 Knowledge Graph — Relations
Use these relations to establish logical structure, semantic dependencies, and inferential flow.

{relations_block}

---

# 📝 Your Output Task
You must generate a refined Markdown report following these rules:

## 1. Required Structure
Your output **must** include the following sections:

1. **{section_headings[0]}**  
2. **{section_headings[1]}**  
3. **{section_headings[2]}**  
4. **{section_headings[3]}**
5. **{section_headings[4]}**

{heading_instruction}

## 2. Output Style
- Prefer concise synthesis over long expansion
- Reuse and improve existing structure when possible instead of rewriting everything from scratch
- Keep the whole report compact and readable; avoid unnecessary repetition
- Prefer short paragraphs and bullets
- Use tables only when they clearly improve readability
- Include at most one Mermaid diagram, and only when it adds real value
- If you include Mermaid, keep it compatible with strict Mermaid rendering:
  use `flowchart TD` or `flowchart LR`
- Use node syntax like `ID["Short label"]`
- Keep node labels short and plain-text only
- Do **not** use HTML tags such as `<br/>` or `<br>`
- Do **not** put Markdown formatting inside Mermaid labels
- Replace label line breaks with spaces instead of HTML
- Avoid raw double quotes inside labels; simplify or rephrase if needed
- If a diagram would require complex or fragile Mermaid syntax, omit the diagram instead

Example (for reference only):
```mermaid
flowchart LR
    A["Concept A"] --> B["Concept B"]
```

## 3. Writing Requirements
- The content must be strictly grounded in the provided material
(no hallucination or invented facts)
- Rewrite, reorganize, and enhance clarity while keeping the meaning accurate
- Use a professional and analytical tone
- If "Current Section Content" exists, treat it as baseline context that must be preserved;
  do not drop existing document analyses, only refine and extend them with the new content
- "Current Section Content" may contain helper blocks such as
  "Context Memory", "Section Head Snapshot", or "Section Tail Snapshot";
  treat them as references only and DO NOT output these helper headings verbatim
- Avoid verbose filler, decorative language, and redundant examples
- Output pure Markdown only, with no additional explanations

⬇️ Please output the final Markdown report now.
"""

    return prompt
