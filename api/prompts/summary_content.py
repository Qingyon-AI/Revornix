def summary_content_prompt(content: str):
    return f"""
You are a professional editor for a digital publishing platform.

Your task is to read the full content below and generate a structured summary that can be used as a **featured content card** on a knowledge platform.

The summary should be returned in the following JSON format:
```json
{{
  "title": "A compelling and concise title within 10 characters",
  "description": "A professional and informative description of at least 100 characters, highlighting the document's context, value, or uniqueness",
  "summary": "A well-structured abstract between 200 and 500 characters, capturing the essence of the document's content"
}}
```

✍️ Guidelines:
- Write in a professional, formal tone.
- Use the same language as the original document.
- The title should be meaningful, attention-grabbing, and topic-specific.
- The description should provide enough background and explain why the document is valuable or relevant.
- The summary should condense the main insights, keeping the most relevant points.
- Do not use vague or promotional phrases (e.g. “this is a great article”)—be specific and informative.
- Avoid repetition between fields.

---

Below is the full document content:

{content}

---
    """
