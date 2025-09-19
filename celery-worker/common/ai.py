import json
import crud
from openai import OpenAI
from common.sql import SessionLocal

def summary_section(user_id: int, model_id: int, markdown_content: str):
    db = SessionLocal()
    db_model = crud.model.get_ai_model_by_id(db=db, model_id=model_id)
    db_user_model = crud.model.get_user_ai_model_by_id_decrypted(db=db, user_id=user_id, model_id=model_id)
    if db_model is None:
        raise Exception("Model not found")
    if db_user_model is None:
        raise Exception("User model not found")
    db_model_provider = crud.model.get_ai_model_provider_by_id(db=db, provider_id=db_model.provider_id)
    db_user_model_provider = crud.model.get_user_ai_model_provider_by_id_decrypted(db=db, user_id=user_id, provider_id=db_model.provider_id)
    if db_model_provider is None:
        raise Exception("Model provider not found")
    if db_user_model_provider is None:
        raise Exception("User model provider not found")
    
    system_prompt = f"""
You are a senior document analyst and knowledge editor for a professional publication platform.

Your task is to read the following markdown document and produce a well-organized and **professionally written summary report** in **Markdown** format.

The report should be structured as follows:

## 📄 Summary Report Format:

### 1. Executive Summary
- A high-level abstract (approx. 100–150 words) summarizing the entire content.

### 2. Background
- Describe the document’s context, motivation, and key background information (if any).

### 3. Key Insights / Findings
- Bullet-point list or sub-sections highlighting important arguments, sections, facts, or observations.

### 4. Analysis
- A logically reasoned overview of the document’s core content and structure.
- You may group ideas into themes or categories, and explain how they relate.

### 5. Conclusion
- Summarize the value, potential impact, or takeaways from the document.

---

### 📌 Requirements:
- Total word count should be **at least 800 words**, unless the source is very short.
- Write in a formal, neutral, and professional tone.
- Use **Markdown formatting** (titles, bullet points, paragraphs).
- Do not fabricate content. Base everything on the original document.

Please return your result in **strict JSON format** like this (and only this):

```json
{{
  "summary": "The full markdown-formatted summary report here"
}}
```

---

Here is the full original document:

{markdown_content}

---

"""
    
    client = OpenAI(
        api_key=db_user_model.api_key if db_user_model.api_key else db_user_model_provider.api_key,
        base_url=db_user_model.api_url if db_user_model.api_url else db_user_model_provider.api_url,
    )
    completion = client.chat.completions.create(
        model=db_model.name,
        messages=[
            {"role": "system", "content": "You are an expert in summarizing document content."},
            {"role": "user", "content": system_prompt}
        ],
        temperature=0.3,
        response_format={"type": "json_object"},
        max_tokens=4096
    )
    content = json.loads(completion.choices[0].message.content)
    summary = content.get('summary')
    db.close()
    return {
        "summary": summary
    }

def summary_section_with_origin(user_id: int, model_id: int, origin_section_markdown_content: str, new_document_markdown_content: str):
    db = SessionLocal()
    db_model = crud.model.get_ai_model_by_id(db=db, model_id=model_id)
    db_user_model = crud.model.get_user_ai_model_by_id_decrypted(db=db, user_id=user_id, model_id=model_id)
    if db_model is None:
        raise Exception("Model not found")
    if db_user_model is None:
        raise Exception("User model not found")
    db_model_provider = crud.model.get_ai_model_provider_by_id(db=db, provider_id=db_model.provider_id)
    db_user_model_provider = crud.model.get_user_ai_model_provider_by_id_decrypted(db=db, user_id=user_id, provider_id=db_model.provider_id)
    if db_model_provider is None:
        raise Exception("Model provider not found")
    if db_user_model_provider is None:
        raise Exception("User model provider not found")
    
    system_prompt = f"""
You are a professional document analyst working on knowledge consolidation for a premium subscription content platform.

You are given:
1. An **existing summary document** that consolidates earlier material.
2. A **new markdown document** with additional important content.

Your task is to produce an **updated and professional summary report** in **Markdown**, integrating both the original summary and the new content. You must reorganize and rewrite as needed to ensure:
- Logical structure
- Professional language
- Complete coverage of all key insights

---

### 📄 Summary Report Structure:

### 1. Executive Summary
- A concise abstract giving readers a full picture at a glance.

### 2. Background
- Context of the topic and any known developments from the original summary.

### 3. New Developments / Additional Insights
- Content and analysis specific to the newly added material.

### 4. Integrated Analysis
- Combine past and present information into thematic insights.

### 5. Conclusion & Outlook
- Final thoughts, open questions, or expected future developments.

---

### 📌 Requirements:
- Markdown format required.
- Total word count should be at least **800 words**.
- Write in a professional and editorial tone suitable for publication.
- Do not append; restructure the content for clarity and coherence.
- Do not invent any content; stay grounded in the provided documents.

Please return your result in the **strict JSON format**:

```json
{{
  "summary": "The full markdown-formatted updated summary report"
}}
```

---

Original Summary Document:

{origin_section_markdown_content}

New Document:

{new_document_markdown_content}

---

"""

    client = OpenAI(
        api_key=db_user_model.api_key if db_user_model.api_key else db_user_model_provider.api_key,
        base_url=db_user_model.api_url if db_user_model.api_url else db_user_model_provider.api_url,
    )
    completion = client.chat.completions.create(
        model=db_model.name,
        messages=[
            {"role": "system", "content": "You are an expert in summarizing document content."},
            {"role": "user", "content": system_prompt}
        ],
        temperature=0.3,
        response_format={"type": "json_object"},
        max_tokens=8192
    )
    content = json.loads(completion.choices[0].message.content)
    summary = content.get('summary')
    db.close()
    return {
        "summary": summary
    }
    
def summary_document(user_id: int, model_id: int, markdown_content: str):
    db = SessionLocal()
    db_model = crud.model.get_ai_model_by_id(db=db, model_id=model_id)
    db_user_model = crud.model.get_user_ai_model_by_id_decrypted(db=db, user_id=user_id, model_id=model_id)
    if db_model is None:
        raise Exception("Model not found")
    if db_user_model is None:
        raise Exception("User model not found")
    db_model_provider = crud.model.get_ai_model_provider_by_id(db=db, provider_id=db_model.provider_id)
    db_user_model_provider = crud.model.get_user_ai_model_provider_by_id_decrypted(db=db, user_id=user_id, provider_id=db_model.provider_id)
    if db_model_provider is None:
        raise Exception("Model provider not found")
    if db_user_model_provider is None:
        raise Exception("User model provider not found")
    
    system_prompt = f"""
You are a professional editor for a digital publishing platform.

Your task is to read the full markdown document below and generate a structured summary that can be used as a **featured content card** on a knowledge platform.

The summary should be returned in the following JSON format:
```json
{{
  "title": "A compelling and concise title within 10 characters",
  "description": "A professional and informative description of at least 100 characters, highlighting the document's context, value, or uniqueness",
  "summary": "A well-structured abstract between 300 and 600 characters, capturing the essence of the document's content"
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

{markdown_content}

---

    """
    
    client = OpenAI(
        api_key=db_user_model.api_key if db_user_model.api_key else db_user_model_provider.api_key,
        base_url=db_user_model.api_url if db_user_model.api_url else db_user_model_provider.api_url,
    )
    completion = client.chat.completions.create(
        model=db_model.name,
        messages=[
            {"role": "system", "content": "You are an expert in summarizing document content."},
            {"role": "user", "content": system_prompt}
        ],
        temperature=0.3,
        response_format={"type": "json_object"},
        max_tokens=4096
    )
    content = json.loads(completion.choices[0].message.content)
    title = content.get('title')
    description = content.get('description')
    summary = content.get('summary')
    db.close()
    return {
        "title": title,
        "description": description,
        "summary": summary
    }