from data.custom_types.all import EntityInfo, RelationInfo

def make_section_markdown_prompt(
    current_markdown_content: str | None,
    new_markdown_contents_to_append: str,
    entities: list[EntityInfo],
    relations: list[RelationInfo]
):
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
You are a **professional technical writer, information architect, and knowledge-graph analyst**.

Your task is to produce a **high-quality, visually enriched, structured Markdown report** based on the following inputs.

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
You must generate a **new, refined, and expanded Markdown report** following these rules:

## 1. Required Structure
Your output **must** include the following sections:

1. **Executive Summary**  
2. **Key Insights**  
3. **Detailed Analysis**  
4. **Knowledge Graph Interpretation**  
5. **Conclusion & Recommendations**

## 2. Visual & Rich-Content Requirements (Mandatory)
Your report **must** incorporate visual elements using Markdown:

- When helpful, include **Mermaid diagrams** (flowchart, concept graph, or sequence diagram)
- Use **tables**, **lists**, **callouts**, and **code blocks** when appropriate

Example (for reference only):
```mermaid
graph LR
    A[Concept A] --> B[Concept B]
```

## 3. Writing Requirements
- The content must be strictly grounded in the provided material
(no hallucination or invented facts)
- Rewrite, reorganize, and enhance clarity while keeping the meaning accurate
- Use a professional and analytical tone
- Output pure Markdown only, with no additional explanations

⬇️ Please output the final Markdown report now.
"""

    return prompt