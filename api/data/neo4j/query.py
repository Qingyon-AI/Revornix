import crud
from langfuse.openai import OpenAI
from langfuse import propagate_attributes
from data.sql.base import SessionLocal
from data.neo4j.search import *
from prompts.query import query_context_summary
from proxy.ai_model_proxy import AIModelProxy

async def global_query(
    user_id: int, 
    query: str
):
    # Perform search
    results = global_search(
        user_id=user_id,
        search_text=query
    )
    prompt = query_context_summary(query, str(results))
    
    db = SessionLocal()
    db_user = crud.user.get_user_by_id(
        db=db, 
        user_id=user_id
    )
    if db_user is None:
        raise Exception("User not found")
    if db_user.default_revornix_model_id is None:
        raise Exception("User default model not found")
    model_configuration = (await AIModelProxy.create(
        user_id=user_id,
        model_id=db_user.default_revornix_model_id
    )).get_configuration()
    
    with propagate_attributes(
        user_id=str(user_id),
        tags=[f'model:{model_configuration.model_name}']
    ):
        llm_client = OpenAI(
            api_key=model_configuration.api_key,
            base_url=model_configuration.base_url
        )
        resp = llm_client.chat.completions.create(
            model=model_configuration.model_name,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.0
        )
        output_text = resp.choices[0].message.content
        return output_text

async def naive_query(
    user_id: int, 
    query: str
):
    # Perform search
    results = naive_search(
        user_id=user_id, 
        search_text=query
    )
    prompt = query_context_summary(query, str(results))
    
    db = SessionLocal()
    db_user = crud.user.get_user_by_id(
        db=db, 
        user_id=user_id
    )
    if db_user is None:
        raise Exception("User not found")
    if db_user.default_revornix_model_id is None:
        raise Exception("User default model not found")
    model_configuration = (await AIModelProxy.create(
        user_id=user_id,
        model_id=db_user.default_revornix_model_id
    )).get_configuration()
    
    with propagate_attributes(
        user_id=str(user_id),
        tags=[f'model:{model_configuration.model_name}']
    ):
        llm_client = OpenAI(
            api_key=model_configuration.api_key,
            base_url=model_configuration.base_url
        )
        resp = llm_client.chat.completions.create(
            model=model_configuration.model_name,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.0
        )
        output_text = resp.choices[0].message.content
        return output_text