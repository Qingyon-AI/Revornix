import json
import inspect

from langfuse import propagate_attributes
from langfuse.openai import AsyncOpenAI

import crud
from common.ai import (
    _get_user_ai_interaction_language,
    build_structured_output_language_instruction,
)
from data.custom_types.all import EntityInfo, RelationInfo
from data.sql.base import async_session_context
from common.logger import exception_logger, format_log_message, info_logger
from common.usage_billing import persist_model_usage_from_completion
from prompts.section_image import IMAGE_PLANNER_SYSTEM, build_image_planner_user_prompt
from base_implement.engine_base import EngineBase
from proxy.ai_model_proxy import AIModelProxy
from schemas.section import ImagePlan, ImagePlanResult

IMAGE_PLANNER_FULL_MARKDOWN_MAX_CHARS = 8_000
IMAGE_PLANNER_MEDIUM_MARKDOWN_MAX_CHARS = 16_000
IMAGE_PLANNER_LONG_MARKDOWN_MAX_CHARS = 32_000
IMAGE_PLANNER_MEDIUM_COMPACT_MAX_CHARS = 10_000
IMAGE_PLANNER_LONG_COMPACT_MAX_CHARS = 8_000
IMAGE_PLANNER_XLONG_COMPACT_MAX_CHARS = 6_000
IMAGE_PLANNER_FULL_MAX_ENTITIES = 120
IMAGE_PLANNER_FULL_MAX_RELATIONS = 160
IMAGE_PLANNER_MEDIUM_MAX_ENTITIES = 96
IMAGE_PLANNER_MEDIUM_MAX_RELATIONS = 140
IMAGE_PLANNER_LONG_MAX_ENTITIES = 72
IMAGE_PLANNER_LONG_MAX_RELATIONS = 108
IMAGE_PLANNER_XLONG_MAX_ENTITIES = 48
IMAGE_PLANNER_XLONG_MAX_RELATIONS = 72


def _build_image_planner_markdown_memory(
    *,
    markdown: str,
    max_chars: int,
) -> str:
    lines = markdown.splitlines()
    memory_lines: list[str] = []
    idx = 0

    while idx < len(lines):
        line = lines[idx].strip()
        idx += 1
        if not line.startswith("#"):
            continue

        snippet = ""
        probe = idx
        while probe < len(lines):
            candidate = lines[probe].strip()
            probe += 1
            if not candidate:
                continue
            if candidate.startswith("#"):
                break
            snippet = candidate
            break

        if len(snippet) > 140:
            snippet = snippet[:137] + "..."
        memory_lines.append(f"- {line}{f' :: {snippet}' if snippet else ''}")

        candidate_memory = "\n".join(memory_lines)
        if len(candidate_memory) >= max_chars:
            break

    if not memory_lines:
        paragraphs = [p.strip() for p in markdown.split("\n\n") if p.strip()]
        fallback_parts: list[str] = []
        if paragraphs:
            fallback_parts.append(f"- First: {paragraphs[0][:160]}")
        if len(paragraphs) > 1:
            fallback_parts.append(f"- Last: {paragraphs[-1][:160]}")
        memory_lines = fallback_parts

    memory = "\n".join(memory_lines).strip()
    if len(memory) > max_chars:
        memory = memory[: max_chars - 3].rstrip() + "..."
    return memory


def _compact_markdown_for_image_planner(
    *,
    markdown: str,
    max_chars: int,
) -> str:
    if len(markdown) <= max_chars:
        return markdown

    head_limit = min(2400, max_chars // 3)
    memory_limit = min(2000, max_chars // 3)
    tail_limit = max(max_chars - head_limit - memory_limit - 64, max_chars // 4)

    head = markdown[:head_limit].strip()
    tail = markdown[-tail_limit:].strip()
    memory = _build_image_planner_markdown_memory(
        markdown=markdown,
        max_chars=memory_limit,
    ).strip()

    compact = (
        "## Structure Memory\n"
        f"{memory}\n\n"
        "## Head Snapshot\n"
        f"{head}\n\n"
        "## Tail Snapshot\n"
        f"{tail}"
    ).strip()
    if len(compact) <= max_chars:
        return compact
    return compact[: max_chars - 3].rstrip() + "..."


def _prepare_image_planner_inputs(
    *,
    markdown: str,
    entities: list[EntityInfo],
    relations: list[RelationInfo],
) -> tuple[str, list[dict], list[dict], str]:
    markdown_length = len(markdown)
    if markdown_length <= IMAGE_PLANNER_FULL_MARKDOWN_MAX_CHARS:
        planner_tier = "full"
        planner_markdown = markdown
        max_entities = IMAGE_PLANNER_FULL_MAX_ENTITIES
        max_relations = IMAGE_PLANNER_FULL_MAX_RELATIONS
    elif markdown_length <= IMAGE_PLANNER_MEDIUM_MARKDOWN_MAX_CHARS:
        planner_tier = "medium"
        planner_markdown = _compact_markdown_for_image_planner(
            markdown=markdown,
            max_chars=IMAGE_PLANNER_MEDIUM_COMPACT_MAX_CHARS,
        )
        max_entities = IMAGE_PLANNER_MEDIUM_MAX_ENTITIES
        max_relations = IMAGE_PLANNER_MEDIUM_MAX_RELATIONS
    elif markdown_length <= IMAGE_PLANNER_LONG_MARKDOWN_MAX_CHARS:
        planner_tier = "long"
        planner_markdown = _compact_markdown_for_image_planner(
            markdown=markdown,
            max_chars=IMAGE_PLANNER_LONG_COMPACT_MAX_CHARS,
        )
        max_entities = IMAGE_PLANNER_LONG_MAX_ENTITIES
        max_relations = IMAGE_PLANNER_LONG_MAX_RELATIONS
    else:
        planner_tier = "xlong"
        planner_markdown = _compact_markdown_for_image_planner(
            markdown=markdown,
            max_chars=IMAGE_PLANNER_XLONG_COMPACT_MAX_CHARS,
        )
        max_entities = IMAGE_PLANNER_XLONG_MAX_ENTITIES
        max_relations = IMAGE_PLANNER_XLONG_MAX_RELATIONS

    entities_dict = [
        e.model_dump(include={"id", "text", "entity_type"})
        for e in entities[:max_entities]
    ]
    relations_dict = [
        r.model_dump(include={"src_node", "tgt_node", "relation_type"})
        for r in relations[:max_relations]
    ]
    return planner_markdown, entities_dict, relations_dict, planner_tier


class ImageGenerateEngineBase(EngineBase):

    async def generate_image(
        self,
        prompt: str
    ) -> str | None:
        raise NotImplementedError("Method not implemented")

    @staticmethod
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

    @staticmethod
    async def plan_images_with_llm(
        user_id: int,
        markdown: str,
        entities: list[EntityInfo],
        relations: list[RelationInfo],
    ) -> ImagePlanResult:
        async with async_session_context() as db:
            db_user = await crud.user.get_user_by_id_async(
                db=db, 
                user_id=user_id
            )
        if db_user is None:
            raise RuntimeError("User not found")
        if db_user.default_document_reader_model_id is None:
            raise RuntimeError("Default document reader model not set")

        planner_markdown, entities_dict, relations_dict, planner_tier = _prepare_image_planner_inputs(
            markdown=markdown,
            entities=entities,
            relations=relations,
        )
        info_logger.info(
            format_log_message(
                "section_image_planner_inputs_prepared",
                user_id=user_id,
                planner_tier=planner_tier,
                original_markdown_chars=len(markdown),
                planner_markdown_chars=len(planner_markdown),
                original_entities=len(entities),
                planner_entities=len(entities_dict),
                original_relations=len(relations),
                planner_relations=len(relations_dict),
            )
        )

        user_prompt = build_image_planner_user_prompt(
            markdown=planner_markdown,
            entities=entities_dict,
            relations=relations_dict,
            max_images=6,
        )
        language_instruction = build_structured_output_language_instruction(
            await _get_user_ai_interaction_language(user_id),
        )

        model_conf = (await AIModelProxy.create(
            user_id=user_id,
            model_id=db_user.default_document_reader_model_id
        )).get_configuration()

        with propagate_attributes(
            user_id=str(user_id),
            tags=[f'model:{model_conf.model_name}']
        ):
            client = AsyncOpenAI(
                api_key=model_conf.api_key,
                base_url=model_conf.base_url,
            )
            try:
                completion = await client.chat.completions.create(
                    model=model_conf.model_name,
                    messages=[
                        {
                            "role": "system",
                            "content": f"{IMAGE_PLANNER_SYSTEM}\n\n{language_instruction}",
                        },
                        {"role": "user", "content": user_prompt},
                    ],
                    response_format={"type": "json_object"}
                )
                await persist_model_usage_from_completion(
                    user_id=user_id,
                    model_id=db_user.default_document_reader_model_id,
                    completion=completion,
                    source="plan_images_with_llm",
                )

                resp_text = completion.choices[0].message.content
                if not resp_text:
                    raise RuntimeError("Image planner returned empty response")

                try:
                    data = json.loads(resp_text)
                except json.JSONDecodeError as e:
                    exception_logger.warning(
                        "[SectionImage] planner returned invalid JSON: "
                        f"user_id={user_id}, planner_tier={planner_tier}, "
                        f"planner_markdown_chars={len(planner_markdown)}, error={e}, response={resp_text}"
                    )
                    raise
                if not isinstance(data, dict):
                    exception_logger.warning(
                        "[SectionImage] planner response is not a JSON object: "
                        f"user_id={user_id}, planner_tier={planner_tier}, "
                        f"planner_markdown_chars={len(planner_markdown)}, "
                        f"type={type(data).__name__}, response={resp_text}"
                    )
                    return ImagePlanResult(
                        markdown_with_markers=markdown,
                        plans=[],
                    )

                raw_plans = data.get("plans") or data.get("image_plans") or []
                if not isinstance(raw_plans, list):
                    exception_logger.warning(
                        "[SectionImage] planner plans is not a list: "
                        f"user_id={user_id}, planner_tier={planner_tier}, "
                        f"planner_markdown_chars={len(planner_markdown)}, "
                        f"keys={list(data.keys())}, response={resp_text}"
                    )
                    raw_plans = []

                plans: list[ImagePlan] = []
                for raw_plan in raw_plans[:6]:
                    try:
                        plans.append(ImagePlan(**raw_plan))
                    except Exception as e:
                        exception_logger.warning(
                            "[SectionImage] skip invalid image plan: "
                            f"user_id={user_id}, planner_tier={planner_tier}, "
                            f"error={e}, raw_plan={raw_plan}"
                        )

                markdown_with_markers = data.get("markdown_with_markers")
                if not isinstance(markdown_with_markers, str) or not markdown_with_markers.strip():
                    exception_logger.warning(
                        "[SectionImage] planner response missing markdown_with_markers; "
                        f"drop plans and fallback to original markdown: user_id={user_id}, "
                        f"planner_tier={planner_tier}, planner_markdown_chars={len(planner_markdown)}, "
                        f"keys={list(data.keys())}, response={resp_text}"
                    )
                    return ImagePlanResult(
                        markdown_with_markers=markdown,
                        plans=[],
                    )

                return ImagePlanResult(
                    markdown_with_markers=markdown_with_markers,
                    plans=plans,
                )
            finally:
                await ImageGenerateEngineBase._safe_close_async_client(client)
