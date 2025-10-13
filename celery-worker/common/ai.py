import json
import crud
from openai import OpenAI
from prompts.summary_section import summary_section_prompt
from prompts.summary_section_with_origin import summary_section_with_origin_prompt
from prompts.summary_document import summary_document_prompt
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
    
    system_prompt = summary_section_prompt(markdown_content=markdown_content)
    
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
    
    system_prompt = summary_section_with_origin_prompt(origin_section_markdown_content=origin_section_markdown_content, 
                                                       new_document_markdown_content=new_document_markdown_content)

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
    
    system_prompt = summary_document_prompt(markdown_content=markdown_content)
    
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