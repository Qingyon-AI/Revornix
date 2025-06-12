import json
import crud
from openai import OpenAI
from common.sql import SessionLocal

def summary_section(user_id: int, model_id: int, markdown_content: str):
    db = SessionLocal()
    db_model = crud.model.get_ai_model_by_id(db=db, model_id=model_id)
    db_user_model = crud.model.get_user_ai_model_by_id(db=db, user_id=user_id, model_id=model_id)
    if db_model is None:
        raise Exception("Model not found")
    if db_user_model is None:
        raise Exception("User model not found")
    db_model_provider = crud.model.get_ai_model_provider_by_id(db=db, provider_id=db_model.provider_id)
    db_user_model_provider = crud.model.get_user_ai_model_provider_by_id(db=db, user_id=user_id, provider_id=db_model.provider_id)
    if db_model_provider is None:
        raise Exception("Model provider not found")
    if db_user_model_provider is None:
        raise Exception("User model provider not found")
    system_prompt = f"""
    This is the entire content of the document, {markdown_content}. 
    Please summarize it in markdown format and provide me with a markdown summary report. 
    The word count should be no less than 800 words, but if the original content is short, the word count can be a bit lower. 
    Please ensure that the response is in the following JSON format:
    {{
    "summary": "Summary"
    }}
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
    return {
        "summary": summary
    }

def summary_section_with_origin(user_id: int, model_id: int, origin_section_markdown_content: str, new_document_markdown_content: str):
    db = SessionLocal()
    db_model = crud.model.get_ai_model_by_id(db=db, model_id=model_id)
    db_user_model = crud.model.get_user_ai_model_by_id(db=db, user_id=user_id, model_id=model_id)
    if db_model is None:
        raise Exception("Model not found")
    if db_user_model is None:
        raise Exception("User model not found")
    db_model_provider = crud.model.get_ai_model_provider_by_id(db=db, provider_id=db_model.provider_id)
    db_user_model_provider = crud.model.get_user_ai_model_provider_by_id(db=db, user_id=user_id, provider_id=db_model.provider_id)
    if db_model_provider is None:
        raise Exception("Model provider not found")
    if db_user_model_provider is None:
        raise Exception("User model provider not found")
    system_prompt = f"""
    This is a summary document that consolidates several foundational documents, {origin_section_markdown_content}. 
    And this is the latest document, {new_document_markdown_content}. 
    Please use the original summary document and the new document to create a new, more complete markdown format summary report for me. 
    The report should be in a format that allows for easy overall review, with a word count of at least 800 words. 
    If the original content is short, the word count can be slightly lower. 
    Please make sure to output your response in the following JSON format:
    {{
    "summary": "Summary Document"
    }}
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
    return {
        "summary": summary
    }
    
def summary_document(user_id: int, model_id: int, markdown_content: str):
    db = SessionLocal()
    db_model = crud.model.get_ai_model_by_id(db=db, model_id=model_id)
    db_user_model = crud.model.get_user_ai_model_by_id(db=db, user_id=user_id, model_id=model_id)
    if db_model is None:
        raise Exception("Model not found")
    if db_user_model is None:
        raise Exception("User model not found")
    db_model_provider = crud.model.get_ai_model_provider_by_id(db=db, provider_id=db_model.provider_id)
    db_user_model_provider = crud.model.get_user_ai_model_provider_by_id(db=db, user_id=user_id, provider_id=db_model.provider_id)
    if db_model_provider is None:
        raise Exception("Model provider not found")
    if db_user_model_provider is None:
        raise Exception("User model provider not found")
    system_prompt = f"""
    This is the entire content of the document, {markdown_content}. Please summarize it using the document's language by providing a title, a brief description, and an overview of the content. The title should be around 10 characters, the description should be no less than 100 characters, and the summary should be between 300 and 600 characters. Please ensure to output your response in the following JSON format:
    {{
    "title": "Title",
    "description": "Description",
    "summary": "Summary"
    }}
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
    return {
        "title": title,
        "description": description,
        "summary": summary
    }