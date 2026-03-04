import crud
import inspect

from langfuse import propagate_attributes

from langfuse.openai import AsyncOpenAI

from common.logger import exception_logger
from data.sql.base import session_scope
from data.neo4j.search import global_search, naive_search
from prompts.query import query_context_summary
from proxy.ai_model_proxy import AIModelProxy


async def _safe_close_async_client(client: AsyncOpenAI) -> None:
    close_fn = getattr(client, "close", None)
    if callable(close_fn):
        try:
            result = close_fn()
            if inspect.isawaitable(result):
                await result
        except RuntimeError as e:
            if "Event loop is closed" not in str(e):
                exception_logger.warning(f"Failed to close async llm client: {e}")
        except Exception as e:
            exception_logger.warning(f"Failed to close async llm client: {e}")
        return

    aclose_fn = getattr(client, "aclose", None)
    if callable(aclose_fn):
        try:
            result = aclose_fn()
            if inspect.isawaitable(result):
                await result
        except RuntimeError as e:
            if "Event loop is closed" not in str(e):
                exception_logger.warning(f"Failed to aclose async llm client: {e}")
        except Exception as e:
            exception_logger.warning(f"Failed to aclose async llm client: {e}")


async def get_query_result_summary_llm_client(
    user_id: int
):
    with session_scope() as db:
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
        
        llm_client = AsyncOpenAI(
            api_key=model_configuration.api_key,
            base_url=model_configuration.base_url,
        )
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
    
    with session_scope() as db:
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
        llm_client = AsyncOpenAI(
            api_key=model_configuration.api_key,
            base_url=model_configuration.base_url
        )
        try:
            resp = await llm_client.chat.completions.create(
                model=model_configuration.model_name,
                messages=[{"role": "user", "content": prompt}]
            )
            output_text = resp.choices[0].message.content
            return output_text
        finally:
            await _safe_close_async_client(llm_client)

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
    
    with session_scope() as db:
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
        llm_client = AsyncOpenAI(
            api_key=model_configuration.api_key,
            base_url=model_configuration.base_url
        )
        try:
            resp = await llm_client.chat.completions.create(
                model=model_configuration.model_name,
                messages=[{"role": "user", "content": prompt}]
            )
            output_text = resp.choices[0].message.content
            return output_text
        finally:
            await _safe_close_async_client(llm_client)
