import base64
import json
from typing import Any

import httpx
from langfuse import propagate_attributes

from base_implement.image_generate_engine_base import ImageGenerateEngineBase
from common.usage_billing import (
    extract_usage_details_from_completion,
    persist_engine_usage,
)
from enums.engine_enums import EngineCategory, EngineProvided
from schemas.error import CustomException

DEFAULT_BASE_URL = "https://api.openai.com/v1"
DEFAULT_MODEL_NAME = "gpt-image-2"
DEFAULT_SIZE = "auto"
DEFAULT_QUALITY = "auto"
DEFAULT_BACKGROUND = "auto"
DEFAULT_OUTPUT_FORMAT = "png"
DEFAULT_MODERATION = "auto"
RESPONSE_PREVIEW_MAX_CHARS = 500


def _build_generate_url(base_url: str) -> str:
    normalized = base_url.rstrip("/")
    if normalized.endswith("/images/generations"):
        return normalized
    return f"{normalized}/images/generations"


def _get_non_negative_int(value: Any) -> int | None:
    if isinstance(value, bool):
        return None
    if isinstance(value, int) and value >= 0:
        return value
    if isinstance(value, str) and value.strip().isdigit():
        parsed = int(value.strip())
        return parsed if parsed >= 0 else None
    return None


def _get_output_format(config: dict[str, Any]) -> str:
    value = config.get("output_format") or DEFAULT_OUTPUT_FORMAT
    return str(value).strip().lower() or DEFAULT_OUTPUT_FORMAT


def _get_background(config: dict[str, Any]) -> str:
    value = str(config.get("background") or DEFAULT_BACKGROUND).strip().lower()
    if value in {"auto", "opaque"}:
        return value
    return DEFAULT_BACKGROUND


def _mime_type_for_format(output_format: str) -> str:
    normalized = output_format.strip().lower()
    if normalized in {"jpg", "jpeg"}:
        return "image/jpeg"
    if normalized == "webp":
        return "image/webp"
    return "image/png"


def _response_preview(response: httpx.Response) -> str:
    text = response.text.strip()
    if len(text) > RESPONSE_PREVIEW_MAX_CHARS:
        return f"{text[:RESPONSE_PREVIEW_MAX_CHARS].rstrip()}..."
    return text


def _parse_json_response(response: httpx.Response) -> dict[str, Any]:
    try:
        response_data = response.json()
    except json.JSONDecodeError as exc:
        preview = _response_preview(response)
        message = (
            "OpenAI image generation returned a non-JSON response: "
            f"status={response.status_code}"
        )
        if preview:
            message = f"{message}, body={preview}"
        raise CustomException(message=message, code=502) from exc

    if not isinstance(response_data, dict):
        raise CustomException(
            message=(
                "OpenAI image generation returned an invalid JSON payload: "
                f"type={type(response_data).__name__}"
            ),
            code=502,
        )
    return response_data


def _raise_for_openai_image_error(response: httpx.Response) -> None:
    if not response.is_error:
        return

    try:
        response_data = _parse_json_response(response)
    except CustomException as exc:
        raise CustomException(
            message=f"OpenAI image generation HTTP error: {exc.message}",
            code=502,
        ) from exc

    error_payload = response_data.get("error")
    if isinstance(error_payload, dict):
        error_message = error_payload.get("message") or error_payload
    else:
        error_message = error_payload or response_data
    raise CustomException(
        message=(
            "OpenAI image generation HTTP error: "
            f"status={response.status_code}, body={error_message}"
        ),
        code=502,
    )


def _build_payload(*, prompt: str, config: dict[str, Any]) -> dict[str, Any]:
    payload: dict[str, Any] = {
        "model": config.get("model_name") or DEFAULT_MODEL_NAME,
        "prompt": prompt,
        "n": 1,
        "size": config.get("size") or DEFAULT_SIZE,
        "quality": config.get("quality") or DEFAULT_QUALITY,
        "background": _get_background(config),
        "output_format": _get_output_format(config),
        "moderation": config.get("moderation") or DEFAULT_MODERATION,
    }

    output_compression = _get_non_negative_int(config.get("output_compression"))
    if output_compression is not None and payload["output_format"] in {"jpeg", "webp"}:
        payload["output_compression"] = min(output_compression, 100)

    return {key: value for key, value in payload.items() if value is not None}


class OpenAIImageGenerateEngine(ImageGenerateEngineBase):

    def __init__(self):
        super().__init__(
            engine_uuid=EngineProvided.OpenAI_Image.meta.uuid,
            engine_name="OpenAI Image",
            engine_name_zh="OpenAI 图像生成",
            engine_category=EngineCategory.IMAGE_GENERATE,
            engine_description="Based on OpenAI GPT Image 2 generation API",
            engine_description_zh="基于 OpenAI GPT Image 2 接口的图像生成引擎",
        )

    async def generate_image(
        self,
        prompt: str,
    ) -> str | None:
        config = self.get_engine_config()
        if config is None:
            raise Exception("The engine hasn't been initialized yet.")

        api_key = config.get("api_key")
        base_url = str(config.get("base_url") or DEFAULT_BASE_URL).rstrip("/")
        model_name = str(config.get("model_name") or DEFAULT_MODEL_NAME)

        if not api_key:
            raise Exception("The configuration of this engine is not complete.")
        if self.user_id is None:
            raise Exception("The user_id is not set.")

        payload = _build_payload(prompt=prompt, config=config)
        output_format = str(payload.get("output_format") or DEFAULT_OUTPUT_FORMAT)

        with propagate_attributes(
            user_id=str(self.user_id),
            tags=[f"model:{model_name}"],
        ):
            async with httpx.AsyncClient(timeout=180.0) as client:
                response = await client.post(
                    _build_generate_url(base_url),
                    headers={
                        "Authorization": f"Bearer {api_key}",
                        "Content-Type": "application/json",
                    },
                    json=payload,
                )
                _raise_for_openai_image_error(response)
                response_data = _parse_json_response(response)

        output_format = str(
            response_data.get("output_format") or output_format or DEFAULT_OUTPUT_FORMAT
        )
        usage_details = extract_usage_details_from_completion(response_data)
        if usage_details:
            await persist_engine_usage(
                user_id=self.user_id,
                resource_uuid=self.resource_uuid or self.engine_uuid,
                usage_details=usage_details,
                source="openai_image_generate",
            )

        data = response_data.get("data")
        if not isinstance(data, list) or not data:
            return None

        image_base64 = data[0].get("b64_json") if isinstance(data[0], dict) else None
        if not isinstance(image_base64, str) or not image_base64.strip():
            return None

        # Validate the provider returned usable base64 before embedding it in Markdown.
        base64.b64decode(image_base64, validate=True)
        return f"![image](data:{_mime_type_for_format(output_format)};base64,{image_base64})"
