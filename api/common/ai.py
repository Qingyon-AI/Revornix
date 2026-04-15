import inspect
import json
import re
import crud

from langfuse import propagate_attributes
from pydantic import BaseModel

from langfuse.openai import AsyncOpenAI

from common.logger import exception_logger, format_log_message
from common.mermaid import sanitize_mermaid_blocks
from common.usage_billing import persist_model_usage_from_completion
from data.custom_types.all import EntityInfo, RelationInfo
from data.sql.base import session_scope
from enums.user import AIInteractionLanguage
from prompts.podcast_dialogue import podcast_dialogue_prompt
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


PODCAST_DIALOGUE_MAX_TURN_LENGTH = 300
PODCAST_DIALOGUE_TARGET_TURN_LENGTH = 260
PODCAST_DIALOGUE_MAX_TOTAL_LENGTH = 10_000
PODCAST_DIALOGUE_MAX_TURNS = 32
PODCAST_SENTENCE_SPLIT_RE = re.compile(r"(?<=[。！？!?；;])")


def _get_user_ai_interaction_language(user_id: int) -> int | None:
    with session_scope() as db:
        db_user = crud.user.get_user_by_id(db=db, user_id=user_id)
        if db_user is None:
            return None
        return db_user.default_ai_interaction_language


def build_text_output_language_instruction(language: int | None) -> str:
    if language == AIInteractionLanguage.CHINESE:
        return (
            "All user-visible output must be written in Simplified Chinese unless "
            "the input explicitly requires another language."
        )
    if language == AIInteractionLanguage.ENGLISH:
        return (
            "All user-visible output must be written in English unless "
            "the input explicitly requires another language."
        )
    return (
        "Choose the output language automatically from the input content. "
        "Use the dominant language of the source material for all user-visible output."
    )


def build_structured_output_language_instruction(language: int | None) -> str:
    if language == AIInteractionLanguage.CHINESE:
        return (
            "For every user-visible string field you generate, use Simplified Chinese "
            "unless the input explicitly requires another language."
        )
    if language == AIInteractionLanguage.ENGLISH:
        return (
            "For every user-visible string field you generate, use English "
            "unless the input explicitly requires another language."
        )
    return (
        "For every user-visible string field you generate, choose the language "
        "automatically from the input content and use the dominant language of the source material."
    )


async def _safe_close_async_client(client: AsyncOpenAI) -> None:
    close_fn = getattr(client, "close", None)
    if callable(close_fn):
        try:
            result = close_fn()
            if inspect.isawaitable(result):
                await result
        except RuntimeError as e:
            if "Event loop is closed" not in str(e):
                exception_logger.warning(
                    format_log_message("async_llm_client_close_failed", error=e)
                )
        except Exception as e:
            exception_logger.warning(
                format_log_message("async_llm_client_close_failed", error=e)
            )
        return

    aclose_fn = getattr(client, "aclose", None)
    if callable(aclose_fn):
        try:
            result = aclose_fn()
            if inspect.isawaitable(result):
                await result
        except RuntimeError as e:
            if "Event loop is closed" not in str(e):
                exception_logger.warning(
                    format_log_message("async_llm_client_aclose_failed", error=e)
                )
        except Exception as e:
            exception_logger.warning(
                format_log_message("async_llm_client_aclose_failed", error=e)
            )

async def summary_content(
    user_id: int,
    model_id: int,
    content: str
):
    language_instruction = build_structured_output_language_instruction(
        _get_user_ai_interaction_language(user_id),
    )
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
                    {
                        "role": "system",
                        "content": (
                            "You are an expert in summarizing document content.\n\n"
                            f"{language_instruction}"
                        ),
                    },
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
    language_instruction = build_structured_output_language_instruction(
        _get_user_ai_interaction_language(user_id),
    )
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
                    {
                        "role": "system",
                        "content": (
                            "You are an expert in summarizing document content.\n\n"
                            f"{language_instruction}"
                        ),
                    },
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
    user_language = _get_user_ai_interaction_language(user_id)
    language_instruction = build_text_output_language_instruction(
        user_language,
    )
    model_configuration = (await AIModelProxy.create(
        user_id=user_id,
        model_id=model_id
    )).get_configuration()

    prompt = make_section_markdown_prompt(
        current_markdown_content=current_markdown_content,
        new_markdown_contents_to_append=new_markdown_contents_to_append,
        entities=entities,
        relations=relations,
        language=user_language,
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
                    {
                        "role": "system",
                        "content": (
                            "You are an expert in summarizing document content.\n\n"
                            f"{language_instruction}"
                        ),
                    },
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
            return sanitize_mermaid_blocks(content)
        finally:
            await _safe_close_async_client(client)


def _extract_json_object_text(content: str) -> str:
    stripped = content.strip()
    if stripped.startswith("```"):
        stripped = re.sub(r"^```(?:json)?\s*", "", stripped)
        stripped = re.sub(r"\s*```$", "", stripped)
    start = stripped.find("{")
    end = stripped.rfind("}")
    if start == -1 or end == -1 or end <= start:
        return stripped
    return stripped[start:end + 1]


def _split_podcast_dialogue_text(text: str) -> list[str]:
    normalized = " ".join(str(text).split()).strip()
    if not normalized:
        return []
    if len(normalized) <= PODCAST_DIALOGUE_TARGET_TURN_LENGTH:
        return [normalized]

    sentences = [
        sentence.strip()
        for sentence in PODCAST_SENTENCE_SPLIT_RE.split(normalized)
        if sentence.strip()
    ]
    if len(sentences) <= 1:
        return [
            normalized[i:i + PODCAST_DIALOGUE_TARGET_TURN_LENGTH].strip()
            for i in range(0, len(normalized), PODCAST_DIALOGUE_TARGET_TURN_LENGTH)
            if normalized[i:i + PODCAST_DIALOGUE_TARGET_TURN_LENGTH].strip()
        ]

    chunks: list[str] = []
    current = ""
    for sentence in sentences:
        if len(sentence) > PODCAST_DIALOGUE_TARGET_TURN_LENGTH:
            if current:
                chunks.append(current)
                current = ""
            chunks.extend(_split_podcast_dialogue_text(sentence))
            continue
        if not current:
            current = sentence
            continue
        if len(current) + len(sentence) <= PODCAST_DIALOGUE_TARGET_TURN_LENGTH:
            current = f"{current}{sentence}"
            continue
        chunks.append(current)
        current = sentence
    if current:
        chunks.append(current)
    return chunks


def _normalize_podcast_dialogue_turns(
    raw_turns,
    *,
    speakers: list[str],
) -> list[dict[str, str]]:
    if not isinstance(raw_turns, list):
        raise ValueError("Podcast dialogue result must contain a list of turns")

    allowed_speakers = [speaker.strip() for speaker in speakers if speaker and speaker.strip()]
    if len(allowed_speakers) != 2:
        raise ValueError("Podcast dialogue requires exactly two speakers")

    normalized_turns: list[dict[str, str]] = []
    total_length = 0
    seen_speakers: set[str] = set()

    for idx, raw_turn in enumerate(raw_turns):
        if len(normalized_turns) >= PODCAST_DIALOGUE_MAX_TURNS:
            break

        if isinstance(raw_turn, dict):
            speaker = str(
                raw_turn.get("speaker")
                or raw_turn.get("role")
                or raw_turn.get("name")
                or allowed_speakers[idx % 2]
            ).strip()
            text = raw_turn.get("text") or raw_turn.get("content") or raw_turn.get("utterance") or ""
        elif isinstance(raw_turn, str):
            speaker = allowed_speakers[idx % 2]
            text = raw_turn
        else:
            continue

        if speaker not in allowed_speakers:
            speaker = allowed_speakers[idx % 2]

        for chunk in _split_podcast_dialogue_text(text):
            if not chunk:
                continue
            chunk = chunk[:PODCAST_DIALOGUE_MAX_TURN_LENGTH].strip()
            if not chunk:
                continue
            if total_length + len(chunk) > PODCAST_DIALOGUE_MAX_TOTAL_LENGTH:
                remaining = PODCAST_DIALOGUE_MAX_TOTAL_LENGTH - total_length
                if remaining <= 80:
                    break
                chunk = chunk[:remaining].rstrip() + "..."
            normalized_turns.append({"speaker": speaker, "text": chunk})
            seen_speakers.add(speaker)
            total_length += len(chunk)
            if (
                len(normalized_turns) >= PODCAST_DIALOGUE_MAX_TURNS
                or total_length >= PODCAST_DIALOGUE_MAX_TOTAL_LENGTH
            ):
                break
        if (
            len(normalized_turns) >= PODCAST_DIALOGUE_MAX_TURNS
            or total_length >= PODCAST_DIALOGUE_MAX_TOTAL_LENGTH
        ):
            break

    if not normalized_turns:
        raise ValueError("Podcast dialogue result is empty after normalization")

    if len(seen_speakers) < 2 and len(normalized_turns) >= 2:
        for idx, turn in enumerate(normalized_turns):
            turn["speaker"] = allowed_speakers[idx % 2]

    return normalized_turns


async def generate_podcast_dialogue_turns(
    *,
    user_id: int,
    model_id: int,
    content: str,
    speakers: list[str],
    title: str | None = None,
    description: str | None = None,
):
    language_instruction = build_structured_output_language_instruction(
        _get_user_ai_interaction_language(user_id),
    )
    model_configuration = (await AIModelProxy.create(
        user_id=user_id,
        model_id=model_id
    )).get_configuration()

    prompt = podcast_dialogue_prompt(
        content=content,
        speakers=speakers,
        title=title,
        description=description,
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
                    {
                        "role": "system",
                        "content": (
                            "You are an expert podcast producer and dialogue writer. "
                            "Your job is to create sharp, high-retention, two-host podcast scripts "
                            "that are natural to speak aloud, structurally coherent, and faithful to the source.\n\n"
                            f"{language_instruction}"
                        ),
                    },
                    {"role": "user", "content": prompt}
                ],
                response_format={"type": "json_object"}
            )
            persist_model_usage_from_completion(
                user_id=user_id,
                model_id=model_id,
                completion=completion,
                source="generate_podcast_dialogue_turns",
                strict=True,
            )
            raw_content = completion.choices[0].message.content
            if raw_content is None:
                raise Exception("No content returned for podcast dialogue")
            payload = json.loads(_extract_json_object_text(raw_content))
            raw_turns = (
                payload.get("nlp_texts")
                or payload.get("turns")
                or payload.get("dialogue")
                or payload.get("rounds")
            )
            return _normalize_podcast_dialogue_turns(
                raw_turns,
                speakers=speakers,
            )
        finally:
            await _safe_close_async_client(client)
