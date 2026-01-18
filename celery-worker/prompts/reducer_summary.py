from data.custom_types.all import EntityInfo, RelationInfo

def reducer_summary_prompt(
    current_summary: str | None,
    new_summary_to_append: str,
    new_entities: list[EntityInfo],
    new_relations: list[RelationInfo]
) -> str:
    entities_lines = "\n".join(
        f"- [Entity] id={e.id}, text=\"{e.text}\", type={e.entity_type}, chunks={e.chunks}"
        for e in new_entities
    )
    relations_lines = "\n".join(
        f"- [Relation] {r.src_node} —{r.relation_type}→ {r.tgt_node}"
        for r in new_relations
    )

    return f"""
You are an expert knowledge-integrator and summarizer.  
You maintain a continuously evolving document summary + knowledge graph.

Below are the inputs you must integrate:

Existing full document summary (may be empty):

```text
{current_summary or ""}
```

New sub-section summary to incorporate:

```text
{new_summary_to_append}
```

New entities extracted from the sub-section:
{entities_lines if entities_lines else "(none)"}

New relations between entities from the sub-section:
{relations_lines if relations_lines else "(none)"}

---

Your tasks
	1.	Combine the existing summary with the new sub-section summary to produce an updated full document summary.
	2.	Preserve existing key points while naturally blending new information.
	3.	Integrate the new entities and relations using their human-readable text when relevant.
	4.	Avoid redundancy; remove overlaps.
	5.	Produce a logically organized, concise, and coherent integrated summary.
	6.	Important: Your final output MUST strictly follow the JSON structure below.
 
---

Final Output Format (strict)

You must output only a valid JSON object in the following structure:

```json
{{
  "title": "A compelling and concise title within 10 characters",
  "description": "A professional and informative description of at least 100 characters, highlighting the document's context, value, or uniqueness",
  "summary": "A well-structured abstract between 200 and 500 characters, capturing the essence of the document's content"
}}
```

Notes:
-	The title MUST be ≤ 10 characters.
-	The description MUST be ≥ 100 characters.
- The summary MUST be 200–500 characters.
-	No additional commentary, no markdown, no code block — only the JSON.
 
"""