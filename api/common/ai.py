import inspect
import json

from langfuse import propagate_attributes
from pydantic import BaseModel

try:
    from langfuse.openai import AsyncOpenAI
except ImportError:  # pragma: no cover
    from openai import AsyncOpenAI

from common.logger import exception_logger
from common.usage_billing import persist_model_usage_from_completion
from data.custom_types.all import EntityInfo, RelationInfo
from prompts.make_section_markdown import make_section_markdown_prompt
from prompts.reducer_summary import reducer_summary_prompt
from prompts.summary_content import summary_content_prompt
from proxy.ai_model_proxy import AIModelProxy


class SummaryResult(BaseModel):
    summary: str

class SummaryResultWithTitleAndDescription(BaseModel):
    title: str
    description: str
    summary: str


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

async def summary_content(
    user_id: int,
    model_id: int,
    content: str
):
    model_configuration = (await AIModelProxy.create(
        user_id=user_id,
        model_id=model_id
    )).get_configuration()

    system_prompt = summary_content_prompt(content=content)

    with propagate_attributes(
        user_id=str(user_id),
        tags=[f'model:{model_configuration.model_name}']
    ):
        client = AsyncOpenAI(
            api_key=model_configuration.api_key,
            base_url=model_configuration.base_url,
        )
        try:
            completion = await client.chat.completions.create(
                model=model_configuration.model_name,
                messages=[
                    {"role": "system", "content": "You are an expert in summarizing document content."},
                    {"role": "user", "content": system_prompt}
                ],
                response_format={"type": "json_object"}
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
            await _safe_close_async_client(client)

async def reducer_summary(
    user_id: int,
    model_id: int,
    current_summary: str | None,
    new_summary_to_append: str,
    new_entities: list[EntityInfo],
    new_relations: list[RelationInfo]
):
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
        client = AsyncOpenAI(
            api_key=model_configuration.api_key,
            base_url=model_configuration.base_url,
        )
        try:
            completion = await client.chat.completions.create(
                model=model_configuration.model_name,
                messages=[
                    {"role": "system", "content": "You are an expert in summarizing document content."},
                    {"role": "user", "content": system_prompt}
                ],
                response_format={"type": "json_object"}
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
            await _safe_close_async_client(client)


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
            completion = await client.chat.completions.create(
                model=model_configuration.model_name,
                messages=[
                    {"role": "system", "content": "You are an expert in summarizing document content."},
                    {"role": "user", "content": prompt}
                ],
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
            return content
        finally:
            await _safe_close_async_client(client)
