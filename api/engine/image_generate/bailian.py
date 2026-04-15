import base64
import mimetypes

import httpx
from langfuse import propagate_attributes

from base_implement.image_generate_engine_base import ImageGenerateEngineBase
from common.usage_billing import persist_engine_usage
from enums.engine_enums import EngineCategory, EngineProvided

DEFAULT_BASE_URL = "https://dashscope.aliyuncs.com"
DEFAULT_MODEL_NAME = "qwen-image-2.0"
DEFAULT_SIZE = "2048*2048"
GENERATE_ENDPOINT_PATH = "/api/v1/services/aigc/multimodal-generation/generation"


def _guess_content_type(*, header_value: str | None, image_url: str) -> str:
    if header_value:
        content_type = header_value.split(";", 1)[0].strip().lower()
        if content_type.startswith("image/"):
            return content_type

    guessed, _ = mimetypes.guess_type(image_url)
    if guessed and guessed.startswith("image/"):
        return guessed
    return "image/png"


def _build_generate_url(base_url: str) -> str:
    normalized = base_url.rstrip("/")
    if normalized.endswith("/api/v1"):
        normalized = normalized[: -len("/api/v1")]
    return f"{normalized}{GENERATE_ENDPOINT_PATH}"


class BailianImageGenerateEngine(ImageGenerateEngineBase):

    def __init__(self):
        super().__init__(
            engine_uuid=EngineProvided.Bailian_Image.meta.uuid,
            engine_name="Bailian Image",
            engine_name_zh="百炼图像生成",
            engine_category=EngineCategory.IMAGE_GENERATE,
            engine_description="Based on Alibaba Cloud Bailian Qwen-Image generation API",
            engine_description_zh="基于阿里云百炼 Qwen-Image 接口的图像生成引擎",
        )

    def generate_image(
        self,
        prompt: str,
    ) -> str | None:
        config = self.get_engine_config()
        if config is None:
            raise Exception("The engine hasn't been initialized yet.")

        api_key = config.get("api_key")
        base_url = (config.get("base_url") or DEFAULT_BASE_URL).rstrip("/")
        model_name = config.get("model_name") or DEFAULT_MODEL_NAME
        size = config.get("size") or DEFAULT_SIZE
        negative_prompt = config.get("negative_prompt")
        prompt_extend = config.get("prompt_extend")
        watermark = config.get("watermark")
        seed = config.get("seed")

        if not api_key:
            raise Exception("The configuration of this engine is not complete.")
        if self.user_id is None:
            raise Exception("The user_id is not set.")

        payload = {
            "model": model_name,
            "input": {
                "messages": [
                    {
                        "role": "user",
                        "content": [{"text": prompt}],
                    }
                ]
            },
            "parameters": {
                "n": 1,
                "size": size,
            },
        }
        if negative_prompt:
            payload["parameters"]["negative_prompt"] = negative_prompt
        if isinstance(prompt_extend, bool):
            payload["parameters"]["prompt_extend"] = prompt_extend
        if isinstance(watermark, bool):
            payload["parameters"]["watermark"] = watermark
        if isinstance(seed, int):
            payload["parameters"]["seed"] = seed

        with propagate_attributes(
            user_id=str(self.user_id),
            tags=[f"model:{model_name}"],
        ):
            with httpx.Client(timeout=180.0) as client:
                response = client.post(
                    _build_generate_url(base_url),
                    headers={
                        "Authorization": f"Bearer {api_key}",
                        "Content-Type": "application/json",
                    },
                    json=payload,
                )
                response.raise_for_status()
                response_data = response.json()

                if response_data.get("code"):
                    raise Exception(
                        f"Bailian image generation failed: "
                        f"{response_data.get('code')}: {response_data.get('message')}"
                    )

                image_url = (
                    response_data.get("output", {})
                    .get("choices", [{}])[0]
                    .get("message", {})
                    .get("content", [{}])[0]
                    .get("image")
                )
                if not image_url:
                    return None

                image_response = client.get(image_url)
                image_response.raise_for_status()

        image_count = response_data.get("usage", {}).get("image_count")
        if isinstance(image_count, int) and image_count > 0:
            persist_engine_usage(
                user_id=self.user_id,
                resource_uuid=self.resource_uuid or self.engine_uuid,
                usage_details={"total": image_count},
                source="bailian_image_generate",
            )

        content_type = _guess_content_type(
            header_value=image_response.headers.get("content-type"),
            image_url=image_url,
        )
        image_base64 = base64.b64encode(image_response.content).decode("ascii")
        return f"![image](data:{content_type};base64,{image_base64})"
