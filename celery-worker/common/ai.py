import inspect
import json
import asyncio
import random
from typing import Any
from langfuse import propagate_attributes
from langfuse.openai import AsyncOpenAI
from prompts.summary_content import summary_content_prompt
from prompts.reducer_summary import reducer_summary_prompt
from prompts.make_section_markdown import make_section_markdown_prompt
from pydantic import BaseModel
from data.custom_types.all import RelationInfo, EntityInfo
from common.logger import exception_logger
from common.mermaid import sanitize_mermaid_blocks
from common.usage_billing import persist_model_usage_from_completion
from proxy.ai_model_proxy import AIModelProxy

class SummaryResult(BaseModel):
    summary: str
    
class SummaryResultWithTitleAndDescription(BaseModel):
    title: str
    description: str
    summary: str


LLM_RETRYABLE_STATUS_CODES = {429, 500, 502, 503, 504}
LLM_RETRY_MAX_ATTEMPTS = 3
LLM_RETRY_BASE_DELAY_SECONDS = 1.5


def _get_error_status_code(error: Exception) -> int | None:
    status_code = getattr(error, "status_code", None)
    if isinstance(status_code, int):
        return status_code

    response = getattr(error, "response", None)
    response_status_code = getattr(response, "status_code", None)
    if isinstance(response_status_code, int):
        return response_status_code

    return None


def _is_retryable_llm_error(error: Exception) -> bool:
    status_code = _get_error_status_code(error)
    if status_code in LLM_RETRYABLE_STATUS_CODES:
        return True

    error_text = str(error).lower()
    return (
        "engine_overloaded" in error_text
        or "engine is currently overloaded" in error_text
        or "rate limit" in error_text
        or "too many requests" in error_text
        or "temporarily unavailable" in error_text
    )


async def _call_with_llm_retry(
    *,
    operation_name: str,
    call,
    user_id: int,
    model_id: int,
):
    last_error: Exception | None = None

    for attempt in range(1, LLM_RETRY_MAX_ATTEMPTS + 1):
        try:
            return await call()
        except Exception as error:
            last_error = error
            retryable = _is_retryable_llm_error(error)
            if not retryable or attempt >= LLM_RETRY_MAX_ATTEMPTS:
                raise

            status_code = _get_error_status_code(error)
            delay_seconds = (
                LLM_RETRY_BASE_DELAY_SECONDS * (2 ** (attempt - 1))
            ) + random.uniform(0, 0.35)
            exception_logger.warning(
                f"event=llm_retry_scheduled operation={operation_name} "
                f"user_id={user_id} model_id={model_id} attempt={attempt} "
                f"max_attempts={LLM_RETRY_MAX_ATTEMPTS} retryable={retryable} "
                f"status_code={status_code} delay_seconds={delay_seconds:.2f} "
                f"error={repr(error)}"
            )
            await asyncio.sleep(delay_seconds)

    if last_error is not None:
        raise last_error
    raise RuntimeError(f"{operation_name} failed without raising an exception")


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

async def make_section_markdown(
    user_id: int,
    model_id: int,
    current_markdown_content: str | None,
    new_markdown_contents_to_append: str,
    entities: list[EntityInfo],
    relations: list[RelationInfo]
):
    model_configuration = (await AIModelProxy.create(
        user_id=user_id,
        model_id=model_id
    )).get_configuration()
    
    prompt = make_section_markdown_prompt(
        current_markdown_content=current_markdown_content,
        new_markdown_contents_to_append=new_markdown_contents_to_append,
        entities=entities,
        relations=relations
    )

    with propagate_attributes(
        user_id=str(user_id),
        tags=[f'model:{model_configuration.model_name}']
    ):
        client = AsyncOpenAI(
            api_key=model_configuration.api_key,
            base_url=model_configuration.base_url,
        )
        try:
            completion = await _call_with_llm_retry(
                operation_name="make_section_markdown",
                user_id=user_id,
                model_id=model_id,
                call=lambda: client.chat.completions.create(
                    model=model_configuration.model_name,
                    messages=[
                        {"role": "system", "content": "You are an expert in summarizing document content."},
                        {"role": "user", "content": prompt}
                    ],
                ),
            )
            persist_model_usage_from_completion(
                user_id=user_id,
                model_id=model_id,
                completion=completion,
                source="make_section_markdown",
            )
            content = completion.choices[0].message.content
            if content is None:
                raise Exception("No content returned for ai")
            return sanitize_mermaid_blocks(content)
        finally:
            await _safe_close_async_client(client)

async def summary_content(
    user_id: int,
    model_id: int,
    content: str,
    *,
    model_configuration: Any | None = None,
    client: AsyncOpenAI | None = None,
):
    if model_configuration is None:
        model_configuration = (await AIModelProxy.create(
            user_id=user_id,
            model_id=model_id
        )).get_configuration()
    
    system_prompt = summary_content_prompt(content=content)
    
    with propagate_attributes(
        user_id=str(user_id),
        tags=[f'model:{model_configuration.model_name}']
    ):
        owns_client = client is None
        if client is None:
            client = AsyncOpenAI(
                api_key=model_configuration.api_key,
                base_url=model_configuration.base_url,
            )
        try:
            completion = await _call_with_llm_retry(
                operation_name="summary_content",
                user_id=user_id,
                model_id=model_id,
                call=lambda: client.chat.completions.create(
                    model=model_configuration.model_name,
                    messages=[
                        {"role": "system", "content": "You are an expert in summarizing document content."},
                        {"role": "user", "content": system_prompt}
                    ],
                    response_format={"type": "json_object"},
                ),
            )
            persist_model_usage_from_completion(
                user_id=user_id,
                model_id=model_id,
                completion=completion,
                source="summary_content",
            )
            res_summary = completion.choices[0].message.content
            if res_summary is None:
                raise Exception("No content returned for ai")
            res_summary = json.loads(res_summary)
            title = res_summary.get('title')
            description = res_summary.get('description')
            summary = res_summary.get('summary')
            return SummaryResultWithTitleAndDescription(
                title=title, 
                description=description, 
                summary=summary
            )
        finally:
            if owns_client:
                await _safe_close_async_client(client)

async def reducer_summary(
    user_id: int,
    model_id: int,
    current_summary: str | None,
    new_summary_to_append: str,
    new_entities: list[EntityInfo],
    new_relations: list[RelationInfo],
    *,
    model_configuration: Any | None = None,
    client: AsyncOpenAI | None = None,
):
    if model_configuration is None:
        model_configuration = (await AIModelProxy.create(
            user_id=user_id,
            model_id=model_id
        )).get_configuration()
    
    system_prompt = reducer_summary_prompt(
        current_summary=current_summary,
        new_summary_to_append=new_summary_to_append,
        new_entities=new_entities,
        new_relations=new_relations
    )
    
    with propagate_attributes(
        user_id=str(user_id),
        tags=[f'model:{model_configuration.model_name}']
    ):
        owns_client = client is None
        if client is None:
            client = AsyncOpenAI(
                api_key=model_configuration.api_key,
                base_url=model_configuration.base_url,
            )
        try:
            completion = await _call_with_llm_retry(
                operation_name="reducer_summary",
                user_id=user_id,
                model_id=model_id,
                call=lambda: client.chat.completions.create(
                    model=model_configuration.model_name,
                    messages=[
                        {"role": "system", "content": "You are an expert in summarizing document content."},
                        {"role": "user", "content": system_prompt}
                    ],
                    response_format={"type": "json_object"},
                ),
            )
            persist_model_usage_from_completion(
                user_id=user_id,
                model_id=model_id,
                completion=completion,
                source="reducer_summary",
            )
            res_summary = completion.choices[0].message.content
            if res_summary is None:
                raise Exception("No content returned for ai")
            res_summary = json.loads(res_summary)
            title = res_summary.get('title')
            description = res_summary.get('description')
            summary = res_summary.get('summary')
            return SummaryResultWithTitleAndDescription(
                title=title, 
                description=description, 
                summary=summary
            )
        finally:
            if owns_client:
                await _safe_close_async_client(client)
