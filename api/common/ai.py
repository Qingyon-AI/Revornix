import json
import crud
from openai import OpenAI
from prompts.summary_section import summary_section_prompt
from prompts.summary_section_with_origin import summary_section_with_origin_prompt
from prompts.summary_content import summary_content_prompt
from prompts.reducer_summary import reducer_summary_prompt
from data.sql.base import SessionLocal
from pydantic import BaseModel
from data.custom_types.all import *

class SummaryResult(BaseModel):
    summary: str
    
class SummaryResultWithTitleAndDescription(BaseModel):
    title: str
    description: str
    summary: str

def summary_section(
    user_id: int, 
    model_id: int, 
    markdown_content: str
):
    db = SessionLocal()
    db_model = crud.model.get_ai_model_by_id(db=db, model_id=model_id)
    db_user_model = crud.model.get_user_ai_model_by_id(
        db=db, 
        user_id=user_id, 
        ai_model_id=model_id
    )
    if db_model is None:
        raise Exception("Model not found")
    if db_user_model is None:
        raise Exception("User model not found")
    db_model_provider = crud.model.get_ai_model_provider_by_id(
        db=db, 
        provider_id=db_model.provider_id
    )
    db_user_model_provider = crud.model.get_user_ai_model_provider_by_id_decrypted(
        db=db, 
        user_id=user_id, 
        ai_model_provider_id=db_model.provider_id
    )
    if db_model_provider is None:
        raise Exception("Model provider not found")
    if db_user_model_provider is None:
        raise Exception("User model provider not found")
    
    system_prompt = summary_section_prompt(markdown_content=markdown_content)
    
    client = OpenAI(
        api_key=db_user_model_provider.api_key,
        base_url=db_user_model_provider.api_url,
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
    content = completion.choices[0].message.content
    if content is None:
        raise Exception("No content returned for ai")
    content = json.loads(content)
    summary = content.get('summary')
    db.close()
    return SummaryResult(summary=summary)

def summary_section_with_origin(
    user_id: int, 
    model_id: int, 
    origin_section_markdown_content: str, 
    new_document_markdown_content: str
):
    db = SessionLocal()
    db_model = crud.model.get_ai_model_by_id(
        db=db, 
        model_id=model_id
    )
    db_user_model = crud.model.get_user_ai_model_by_id(
        db=db, 
        user_id=user_id, 
        ai_model_id=model_id
    )
    if db_model is None:
        raise Exception("Model not found")
    if db_user_model is None:
        raise Exception("User model not found")
    db_model_provider = crud.model.get_ai_model_provider_by_id(
        db=db, 
        provider_id=db_model.provider_id
    )
    db_user_model_provider = crud.model.get_user_ai_model_provider_by_id_decrypted(
        db=db, 
        user_id=user_id, 
        ai_model_provider_id=db_model.provider_id
    )
    if db_model_provider is None:
        raise Exception("Model provider not found")
    if db_user_model_provider is None:
        raise Exception("User model provider not found")
    
    system_prompt = summary_section_with_origin_prompt(
        origin_section_markdown_content=origin_section_markdown_content, 
        new_document_markdown_content=new_document_markdown_content
    )

    client = OpenAI(
        api_key=db_user_model_provider.api_key,
        base_url=db_user_model_provider.api_url,
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
    content = completion.choices[0].message.content
    if content is None:
        raise Exception("No content returned for ai")
    content = json.loads(content)
    summary = content.get('summary')
    db.close()
    return SummaryResult(summary=summary)

def summary_content(
    user_id: int,
    model_id: int,
    content: str
):
    db = SessionLocal()
    db_model = crud.model.get_ai_model_by_id(
        db=db, 
        model_id=model_id
    )
    db_user_model = crud.model.get_user_ai_model_by_id(
        db=db, 
        user_id=user_id, 
        ai_model_id=model_id
    )
    if db_model is None:
        raise Exception("Model not found")
    if db_user_model is None:
        raise Exception("User model not found")
    db_model_provider = crud.model.get_ai_model_provider_by_id(
        db=db, 
        provider_id=db_model.provider_id
    )
    db_user_model_provider = crud.model.get_user_ai_model_provider_by_id_decrypted(
        db=db, 
        user_id=user_id, 
        ai_model_provider_id=db_model.provider_id
    )
    if db_model_provider is None:
        raise Exception("Model provider not found")
    if db_user_model_provider is None:
        raise Exception("User model provider not found")
    system_prompt = summary_content_prompt(content=content)
    client = OpenAI(
        api_key=db_user_model_provider.api_key,
        base_url=db_user_model_provider.api_url,
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
    res_summary = completion.choices[0].message.content
    if res_summary is None:
        raise Exception("No content returned for ai")
    res_summary = json.loads(res_summary)
    title = res_summary.get('title')
    description = res_summary.get('description')
    summary = res_summary.get('summary')
    db.close()
    return SummaryResultWithTitleAndDescription(
        title=title, 
        description=description, 
        summary=summary
    )

def reducer_summary(
    user_id: int,
    model_id: int,
    current_summary: str | None,
    new_summary_to_append: str,
    new_entities: list[EntityInfo],
    new_relations: list[RelationInfo]
):
    db = SessionLocal()
    db_model = crud.model.get_ai_model_by_id(
        db=db, 
        model_id=model_id
    )
    db_user_model = crud.model.get_user_ai_model_by_id(
        db=db, 
        user_id=user_id, 
        ai_model_id=model_id
    )
    if db_model is None:
        raise Exception("Model not found")
    if db_user_model is None:
        raise Exception("User model not found")
    db_model_provider = crud.model.get_ai_model_provider_by_id(
        db=db, 
        provider_id=db_model.provider_id
    )
    db_user_model_provider = crud.model.get_user_ai_model_provider_by_id_decrypted(
        db=db, 
        user_id=user_id, 
        ai_model_provider_id=db_model.provider_id
    )
    if db_model_provider is None:
        raise Exception("Model provider not found")
    if db_user_model_provider is None:
        raise Exception("User model provider not found")
    system_prompt = reducer_summary_prompt(
        current_summary=current_summary,
        new_summary_to_append=new_summary_to_append,
        new_entities=new_entities,
        new_relations=new_relations
    )
    client = OpenAI(
        api_key=db_user_model_provider.api_key,
        base_url=db_user_model_provider.api_url,
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
    res_summary = completion.choices[0].message.content
    if res_summary is None:
        raise Exception("No content returned for ai")
    res_summary = json.loads(res_summary)
    title = res_summary.get('title')
    description = res_summary.get('description')
    summary = res_summary.get('summary')
    db.close()
    return SummaryResultWithTitleAndDescription(
        title=title, 
        description=description, 
        summary=summary
    )