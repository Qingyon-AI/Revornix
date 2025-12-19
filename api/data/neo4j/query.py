import openai
import crud
from data.sql.base import SessionLocal
from data.neo4j.search import *
from prompts.query import query_context_summary
from proxy.ai_model_proxy import AIModelProxy

async def get_query_result_summary_llm_client(
    user_id: int
):
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
    
    llm_client = openai.OpenAI(
        api_key=model_configuration.api_key,
        base_url=model_configuration.base_url,
    )
    db.close()
    return llm_client

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
    llm_client = await get_query_result_summary_llm_client(
        user_id=user_id
    )
    resp = llm_client.chat.completions.create(
        model="kimi-latest",
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
    llm_client = await get_query_result_summary_llm_client(
        user_id=user_id
    )
    resp = llm_client.chat.completions.create(
        model="kimi-latest",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.0
    )
    output_text = resp.choices[0].message.content
    return output_text