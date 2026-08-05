def summary_section_with_origin_prompt(origin_section_markdown_content: str, new_document_markdown_content: str):
    prompt = f"""
You are a **professional document analyst and editorial writer** working on knowledge consolidation for a premium research and content platform.

You are given:
1. An **existing summary document** that consolidates earlier material.
2. A **new markdown document** with additional important content.

Your task is to produce an **updated, professional, and publication-ready summary report** in **Markdown**, integrating both the original summary and the new content.  
You must **reorganize and rewrite** as needed to ensure:
- Logical structure and smooth transitions  
- Professional, editorial-grade tone  
- Complete coverage of all key insights  
- Consistency in writing style and information accuracy  

---

## 📄 Expected Report Structure:

### 🏷 Title
A meaningful, attention-grabbing, topic-specific title.

### 📝 Description
A short (2–4 sentences) introduction summarizing the focus and significance of the report.  
Explain *why* the topic matters and *what value* this report provides to the reader.

### 1. Executive Summary
- A concise overview giving readers a complete picture at a glance.

### 2. Background
- Context of the topic, prior developments, and relevant information from the **original summary**.

### 3. New Developments / Additional Insights
- Key findings, updates, or new content derived from the **new markdown document**.

### 4. Integrated Analysis
- Synthesize old and new insights into unified themes or arguments.  
- Highlight connections, evolutions, or contradictions across time.

### 5. Conclusion & Outlook
- Final reflections, implications, or forward-looking perspectives.

---

## ✍️ Guidelines

- Write in a **professional, formal tone** (editorial or research-report style).  
- Use the **same language** as the original document (do not translate).  
- The **title** must be clear, specific, and related to the document’s theme.  
- The **description** should explain why this topic is relevant or valuable.  
- The **summary sections** must convey key insights clearly and avoid redundancy.  
- Do **not** use vague, promotional, or filler phrases (e.g., “this is a great article”).  
- Be **specific**, **informative**, and **precise**.  
- Avoid repetition between sections.  
- Maintain factual consistency; do not invent new information.  
- Total output length should be **at least 800 words**.

---

## 📦 Output Format (Strict JSON)

You must return a valid JSON object with the following structure:

```json
{{
  "title": "Concise and meaningful title",
  "description": "Brief introduction highlighting the topic’s relevance",
  "summary": "Full markdown-formatted updated summary report"
}}
```

---

## 🧾 Input Materials

**Original Summary Document:**
`{origin_section_markdown_content}`

**New Document:**
`{new_document_markdown_content}`

---
"""
    return prompt
