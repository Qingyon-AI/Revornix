import openai
import crud
from common.sql import SessionLocal
from data.neo4j.search import *
from prompts.query import query_context_summary

def get_query_result_summary_llm_client(user_id: int) -> openai.OpenAI:
    db = SessionLocal()
    db_user = crud.user.get_user_by_id(db=db, 
                                       user_id=user_id)
    db = SessionLocal()
    db_model = crud.model.get_ai_model_by_id(db=db, 
                                             model_id=db_user.default_revornix_model_id)
    db_user_model = crud.model.get_user_ai_model_by_id_decrypted(
        db=db, 
        user_id=user_id, 
        ai_model_id=db_user.default_revornix_model_id
    )
    if db_model is None:
        raise Exception("Model not found")
    if db_user_model is None:
        raise Exception("User model not found")
    db_model_provider = crud.model.get_ai_model_provider_by_id(db=db, 
                                                               provider_id=db_model.provider_id)
    db_user_model_provider = crud.model.get_user_ai_model_provider_by_id_decrypted(
        db=db, 
        user_id=user_id, 
        ai_model_provider_id=db_model.provider_id
    )
    if db_model_provider is None:
        raise Exception("Model provider not found")
    if db_user_model_provider is None:
        raise Exception("User model provider not found")
    llm_client = openai.OpenAI(
        api_key=db_user_model.api_key if db_user_model.api_key else db_user_model_provider.api_key,
        base_url=db_user_model.api_url if db_user_model.api_url else db_user_model_provider.api_url,
    )
    db.close()
    return llm_client

def global_query(user_id: int, query: str):
    # Perform search
    results = global_search(user_id=user_id,
                            search_text=query)
    prompt = query_context_summary(query, str(results))
    llm_client = get_query_result_summary_llm_client(user_id=user_id)
    resp = llm_client.chat.completions.create(
        model="kimi-latest",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.0
    )
    output_text = resp.choices[0].message.content
    return output_text

def naive_query(user_id: int, query: str):
    # Perform search
    results = naive_search(user_id=user_id, 
                           search_text=query)
    prompt = query_context_summary(query, str(results))
    llm_client = get_query_result_summary_llm_client(user_id=user_id)
    resp = llm_client.chat.completions.create(
        model="kimi-latest",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.0
    )
    output_text = resp.choices[0].message.content
    return output_text