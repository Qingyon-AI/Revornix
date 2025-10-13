def summary_section_prompt(markdown_content: str):
    prompt = f"""
You are a **senior document analyst and professional editor** for a research and publication platform.

Your role is to read and analyze the following markdown document, then produce a **well-structured, editorial-grade summary report** written in **Markdown** format.

Your summary should **accurately reflect** the original document’s key insights, organization, and tone — while improving clarity, conciseness, and readability.

---

## 📄 Expected Report Structure

### 🏷 Title
A concise, topic-specific title summarizing the document’s main theme.

### 📝 Description
A 2–4 sentence overview explaining the topic’s relevance, purpose, and importance.

### 1. Executive Summary
- A clear, high-level abstract (about 100–150 words) that summarizes the overall content and main arguments.

### 2. Background
- Describe the context, motivation, and background of the document.
- Mention any historical, theoretical, or practical framing if present.

### 3. Key Insights / Findings
- Present the most important points, discoveries, or conclusions.
- Use bullet points or sub-sections to organize ideas logically.

### 4. Analysis
- Provide a structured synthesis of the document’s main reasoning or arguments.
- Group insights by theme, and explain relationships or contrasts between them.

### 5. Conclusion
- Summarize the document’s contribution, implications, and key takeaways.
- Include any forward-looking remarks or open questions if relevant.

---

## ✍️ Editorial Guidelines

- Write in a **formal, neutral, and professional tone**.  
- Use the **same language** as the original document (do not translate).  
- Focus on **clarity**, **precision**, and **logical flow**.  
- Avoid filler phrases (e.g. “this is an excellent article”) and vague commentary.  
- Do **not** fabricate new information or interpretations.  
- Ensure all claims or summaries are **traceable to the source document**.  
- Avoid redundancy between sections.  
- The report should read like a **professional editorial summary** or a **research digest**.  
- The total length should be **at least 800 words**, unless the source document is very short.  
- Use **Markdown formatting** for clear hierarchy and readability (titles, lists, paragraphs).  

---

## 📦 Output Format (Strict JSON)

Your output must be valid JSON — no extra commentary or explanation.

```json
{{
  "title": "Concise, meaningful title related to the document",
  "description": "Brief overview highlighting the topic’s relevance",
  "summary": "Full markdown-formatted summary report"
}}
```

---

## 🧾 Input Document

`{markdown_content}`

---
"""
    return prompt
