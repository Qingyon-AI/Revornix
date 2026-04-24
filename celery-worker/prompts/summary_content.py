def summary_content_prompt(content: str, *, purpose: str = "card"):
    if purpose == "section_fast_path":
        return f"""
You are a senior editor preparing the first draft of a knowledge column.

Read the full source content and return a compact structured result that can be expanded into a high-quality column.

Return valid JSON in exactly this shape:
```json
{{
  "title": "A concrete, publication-worthy title",
  "description": "A strong opening setup in 2-4 sentences explaining what the topic is, why it matters, and what tension or question drives the piece",
  "summary": "A dense editorial brief in 300-900 characters that extracts the main argument, the most important supporting points, and the most interesting implications"
}}
```

Guidelines:
- Use the same language as the source document.
- Write like an editor, not like a marketing writer or a generic summarizer.
- The title must be specific, topical, and strong enough for a real column.
- The description should feel like the opening frame of the article, not a product blurb.
- The summary should capture argument, structure, and implications, not just list facts.
- Prioritize what is most worth saying over exhaustive coverage.
- Avoid vague praise, filler, and generic framing.
- Avoid repetition between title, description, and summary.

Below is the full document content:

{content}
"""

    prompt = f"""
You are a professional editor for a digital publishing platform.

Your task is to read the full content below and generate a structured summary that can be used as a featured content card on a knowledge platform.

The summary should be returned in the following JSON format:
```json
{{
  "title": "A compelling and concise title within 10 characters",
  "description": "A professional and informative description of at least 100 characters, highlighting the document's context, value, or uniqueness",
  "summary": "A well-structured abstract between 200 and 500 characters, capturing the essence of the document's content"
}}
```

Guidelines:
- Write in a professional, formal tone.
- Use the same language as the original document.
- The title should be meaningful, attention-grabbing, and topic-specific.
- The description should provide enough background and explain why the document is valuable or relevant.
- The summary should condense the main insights, keeping the most relevant points.
- Do not use vague or promotional phrases (e.g. "this is a great article") - be specific and informative.
- Avoid repetition between fields.

Below is the full document content:

{content}
"""
    return prompt
